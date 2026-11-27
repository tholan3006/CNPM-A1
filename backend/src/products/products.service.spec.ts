import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService (Unit)', () => {
  let service: ProductsService;
  let prismaMock: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    topping: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      topping: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('trả về danh sách sản phẩm active với giá kiểu number và tự suy luận category', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Cà phê sữa đá',
          description: 'Cà phê pha phin truyền thống',
          price: '29000.00',
          isActive: true,
        },
        {
          id: 'p2',
          name: 'Americano',
          description: 'Espresso pha loãng',
          price: '35000.00',
          isActive: true,
        },
        {
          id: 'p3',
          name: 'Trà đào cam sả',
          description: 'Trà trái cây thanh mát',
          price: '42000.00',
          isActive: true,
        },
        {
          id: 'p4',
          name: 'Cold Brew',
          description: 'Ủ lạnh 18 giờ',
          price: '45000.00',
          isActive: true,
        },
        {
          id: 'p5',
          name: 'Matcha Latte',
          description: 'Bột trà xanh Nhật Bản',
          price: '49000.00',
          isActive: true,
        },
      ]);

      const result = await service.findAll();

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(5);
      expect(typeof result[0].price).toBe('number');
      expect(result.map((p) => p.category)).toEqual([
        'Cà phê truyền thống',
        'Cà phê Espresso',
        'Trà hoa quả',
        'Cold Brew',
        'Trà & Matcha',
      ]);
    });

    it('hỗ trợ lọc tìm kiếm theo tên hoặc mô tả (trim và không phân biệt hoa thường)', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      await service.findAll('  matcha  ');

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'matcha', mode: 'insensitive' } },
            { description: { contains: 'matcha', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findAllToppings', () => {
    it('trả về danh sách topping khả dụng sắp xếp theo giá tăng dần và ép price thành number', async () => {
      prismaMock.topping.findMany.mockResolvedValue([
        { id: 't1', name: 'Thạch cà phê', price: '8000.00', isAvailable: true },
        { id: 't2', name: 'Kem Cheese', price: '10000.00', isAvailable: true },
      ]);

      const result = await service.findAllToppings();

      expect(prismaMock.topping.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        orderBy: { price: 'asc' },
      });
      expect(result).toEqual([
        { id: 't1', name: 'Thạch cà phê', price: 8000, isAvailable: true },
        { id: 't2', name: 'Kem Cheese', price: 10000, isAvailable: true },
      ]);
    });
  });

  describe('findOne', () => {
    it('trả về chi tiết sản phẩm kèm danh sách topping khi sản phẩm tồn tại và đang bán', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Trà đào cam sả',
        description: 'Thơm mát',
        price: '42000.00',
        isActive: true,
      });
      prismaMock.topping.findMany.mockResolvedValue([
        { id: 't1', name: 'Đào miếng', price: '10000.00', isAvailable: true },
      ]);

      const result = await service.findOne('p1');

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(result.price).toBe(42000);
      expect(result.category).toBe('Trà hoa quả');
      expect(result.toppings).toEqual([
        { id: 't1', name: 'Đào miếng', price: 10000, isAvailable: true },
      ]);
    });

    it('ném NotFoundException khi sản phẩm không tồn tại', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ném NotFoundException khi sản phẩm đã ngừng bán (isActive = false)', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'p-inactive',
        name: 'Món cũ',
        price: '30000.00',
        isActive: false,
      });

      await expect(service.findOne('p-inactive')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
