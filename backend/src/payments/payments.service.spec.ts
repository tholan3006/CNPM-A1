import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService (Unit)', () => {
  let service: PaymentsService;
  let txMock: {
    order: {
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    payment: {
      create: jest.Mock;
    };
    user: {
      update: jest.Mock;
    };
  };
  let prismaMock: {
    payment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    order: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    txMock = {
      order: {
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };

    prismaMock = {
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('trả về kết quả giao dịch cũ (idempotentReplay = true) khi gửi trùng Idempotency-Key cho cùng đơn hàng', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ord-1',
        idempotencyKey: 'idem-001',
        amount: '50000.00',
        method: PaymentMethod.E_WALLET,
        status: PaymentStatus.SUCCESS,
        transactionRef: 'MOCK-123',
        order: {
          id: 'ord-1',
          status: OrderStatus.PAID,
          subtotal: '50000.00',
          discountAmount: '0.00',
          total: '50000.00',
        },
      });

      const result = await service.processPayment(
        { orderId: 'ord-1', method: PaymentMethod.E_WALLET },
        'idem-001',
        'user-1',
      );

      expect(result.idempotentReplay).toBe(true);
      expect(result.amount).toBe(50000);
      expect(result.order?.status).toBe(OrderStatus.PAID);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('ném ConflictException khi tái sử dụng Idempotency-Key cho đơn hàng khác', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ord-1',
        idempotencyKey: 'idem-001',
      });

      await expect(
        service.processPayment(
          { orderId: 'ord-2', method: PaymentMethod.E_WALLET },
          'idem-001',
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('ném NotFoundException khi đơn hàng không tồn tại', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.processPayment(
          { orderId: 'missing-ord', method: PaymentMethod.BANK_CARD },
          'idem-002',
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException khi thanh toán hộ đơn hàng của người dùng khác', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'owner-user',
        status: OrderStatus.PENDING,
        total: '45000.00',
      });

      await expect(
        service.processPayment(
          { orderId: 'ord-1', method: PaymentMethod.E_WALLET },
          'idem-003',
          'other-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ném BadRequestException khi đơn hàng đã PAID hoặc CANCELLED', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        total: '45000.00',
      });

      await expect(
        service.processPayment(
          { orderId: 'ord-1', method: PaymentMethod.E_WALLET },
          'idem-004',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném BadRequestException khi số tiền client gửi không khớp tổng tiền đơn hàng', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        total: '50000.00',
      });

      await expect(
        service.processPayment(
          {
            orderId: 'ord-1',
            method: PaymentMethod.BANK_CARD,
            amount: 40000,
          },
          'idem-005',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('thanh toán thành công: chuyển đơn sang PAID, tạo Payment SUCCESS và cộng điểm thưởng (1 điểm / 10.000đ)', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        subtotal: '55000.00',
        discountAmount: '0.00',
        total: '55000.00',
        notes: null,
      });

      txMock.order.updateMany.mockResolvedValue({ count: 1 });
      txMock.payment.create.mockImplementation(async ({ data }) => ({
        id: 'pay-new',
        ...data,
      }));
      txMock.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PAID,
        subtotal: '55000.00',
        discountAmount: '0.00',
        total: '55000.00',
      });
      txMock.user.update.mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 5,
      });

      const result = await service.processPayment(
        { orderId: 'ord-1', method: PaymentMethod.E_WALLET },
        'idem-ok',
        'user-1',
      );

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.idempotentReplay).toBe(false);
      expect(result.transactionRef).toMatch(/^MOCK-/);
      expect(result.order?.status).toBe(OrderStatus.PAID);
      expect(result.loyaltyPoints).toBe(5);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { increment: 5 } },
      });
    });

    it('giả lập thanh toán thất bại (simulateFailure = true): chuyển đơn sang PAYMENT_FAILED và không cộng điểm', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        subtotal: '50000.00',
        discountAmount: '0.00',
        total: '50000.00',
        notes: null,
      });

      txMock.order.updateMany.mockResolvedValue({ count: 1 });
      txMock.payment.create.mockImplementation(async ({ data }) => ({
        id: 'pay-fail',
        ...data,
      }));
      txMock.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PAYMENT_FAILED,
        subtotal: '50000.00',
        discountAmount: '0.00',
        total: '50000.00',
      });

      const result = await service.processPayment(
        {
          orderId: 'ord-1',
          method: PaymentMethod.BANK_CARD,
          simulateFailure: true,
        },
        'idem-fail',
        'user-1',
      );

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.transactionRef).toBeNull();
      expect(result.order?.status).toBe(OrderStatus.PAYMENT_FAILED);
      expect(txMock.user.update).not.toHaveBeenCalled();
    });

    it('xử lý race condition trùng khóa P2002: đọc lại giao dịch đã tạo và trả idempotentReplay = true', async () => {
      prismaMock.payment.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'pay-raced',
          orderId: 'ord-1',
          idempotencyKey: 'idem-race',
          amount: '50000.00',
          method: PaymentMethod.E_WALLET,
          status: PaymentStatus.SUCCESS,
          order: {
            id: 'ord-1',
            status: OrderStatus.PAID,
            subtotal: '50000.00',
            discountAmount: '0.00',
            total: '50000.00',
          },
        });

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'user-1',
        status: OrderStatus.PENDING,
        total: '50000.00',
      });

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.22.0' },
      );
      prismaMock.$transaction.mockRejectedValueOnce(p2002Error);

      const result = await service.processPayment(
        { orderId: 'ord-1', method: PaymentMethod.E_WALLET },
        'idem-race',
        'user-1',
      );

      expect(result.idempotentReplay).toBe(true);
      expect(result.id).toBe('pay-raced');
    });
  });

  describe('findByOrder', () => {
    it('ném NotFoundException khi không tìm thấy đơn hàng', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findByOrder('missing-ord', 'user-1', 'CUSTOMER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException khi khách hàng xem giao dịch đơn của người khác', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'owner-1',
      });

      await expect(
        service.findByOrder('ord-1', 'other-user', 'CUSTOMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cho phép chủ đơn hoặc BARISTA/ADMIN xem danh sách giao dịch với amount dạng number', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'owner-1',
      });
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          orderId: 'ord-1',
          amount: '42000.00',
          status: PaymentStatus.SUCCESS,
        },
      ]);

      const ownerRes = await service.findByOrder('ord-1', 'owner-1', 'CUSTOMER');
      expect(ownerRes).toEqual([
        {
          id: 'pay-1',
          orderId: 'ord-1',
          amount: 42000,
          status: PaymentStatus.SUCCESS,
        },
      ]);

      const staffRes = await service.findByOrder('ord-1', 'barista-1', 'BARISTA');
      expect(staffRes).toHaveLength(1);
    });
  });
});
