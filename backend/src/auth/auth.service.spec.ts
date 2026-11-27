import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService (Unit)', () => {
  let service: AuthService;
  let prismaMock: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtServiceMock: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtServiceMock = {
      signAsync: jest.fn().mockResolvedValue('mocked.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('chuẩn hóa email, băm mật khẩu bằng bcrypt, tạo user và trả về JWT không lộ passwordHash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(async ({ data }) => ({
        id: 'user-1',
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: Role.CUSTOMER,
        loyaltyPoints: 0,
      }));

      const result = await service.register({
        email: '  NewUser@BrewLite.com ',
        password: 'password123',
        fullName: '  Nguyễn Văn A  ',
        phone: ' 0901234567 ',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@brewlite.com' },
      });

      const createArg = prismaMock.user.create.mock.calls[0][0].data;
      expect(createArg.email).toBe('newuser@brewlite.com');
      expect(createArg.fullName).toBe('Nguyễn Văn A');
      expect(createArg.phone).toBe('0901234567');
      expect(createArg.passwordHash).not.toBe('password123');
      expect(createArg.passwordHash.startsWith('$2b$')).toBe(true);
      await expect(
        bcrypt.compare('password123', createArg.passwordHash),
      ).resolves.toBe(true);

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'newuser@brewlite.com',
        role: Role.CUSTOMER,
      });
      expect(result.access_token).toBe('mocked.jwt.token');
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'newuser@brewlite.com',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        role: Role.CUSTOMER,
        loyaltyPoints: 0,
      });
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('ném ConflictException khi email đã tồn tại', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-1',
        email: 'dup@brewlite.com',
      });

      await expect(
        service.register({
          email: 'DUP@brewlite.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('xác thực đúng mật khẩu bcrypt và trả về JWT kèm thông tin user an toàn', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'customer@brewlite.com',
        passwordHash,
        fullName: 'Khách hàng',
        phone: '0912345678',
        role: Role.CUSTOMER,
        loyaltyPoints: 50,
      });

      const result = await service.login({
        email: ' Customer@BrewLite.com ',
        password: 'secret123',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'customer@brewlite.com' },
      });
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        sub: 'user-2',
        email: 'customer@brewlite.com',
        role: Role.CUSTOMER,
      });
      expect(result.access_token).toBe('mocked.jwt.token');
      expect(result.user.loyaltyPoints).toBe(50);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('ném UnauthorizedException khi email không tồn tại', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@brewlite.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ném UnauthorizedException khi sai mật khẩu', async () => {
      const passwordHash = await bcrypt.hash('correct-pass', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'customer@brewlite.com',
        passwordHash,
        role: Role.CUSTOMER,
      });

      await expect(
        service.login({
          email: 'customer@brewlite.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('trả về 6 trường hồ sơ người dùng và ẩn passwordHash', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'barista@brewlite.com',
        passwordHash: '$2b$10$hidden',
        fullName: 'Nhân viên Quầy',
        phone: '0988777666',
        role: Role.BARISTA,
        loyaltyPoints: 120,
      });

      const profile = await service.getProfile('user-3');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-3' },
      });
      expect(profile).toEqual({
        id: 'user-3',
        email: 'barista@brewlite.com',
        fullName: 'Nhân viên Quầy',
        phone: '0988777666',
        role: Role.BARISTA,
        loyaltyPoints: 120,
      });
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('ném UnauthorizedException khi không tìm thấy user theo userId', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
