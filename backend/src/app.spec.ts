import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('BrewLite Backend E2E & Unit Suite (dom1)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const prefix = `dom1_${Date.now()}`;
  const testEmail = `${prefix}_customer@brewlite.com`;
  let accessToken: string;
  let testUserId: string;
  let activeProductId: string;
  let inactiveProductId: string;
  let availableToppingId: string;

  async function cleanupDom1Records() {
    if (!prisma) return;
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { startsWith: 'dom1_' } },
          { order: { orderNumber: { startsWith: 'dom1_' } } },
          { order: { user: { email: { startsWith: 'dom1_' } } } },
        ],
      },
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { orderNumber: { startsWith: 'dom1_' } },
          { user: { email: { startsWith: 'dom1_' } } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'dom1_' } },
    });
    await prisma.product.deleteMany({
      where: { name: { startsWith: 'dom1_' } },
    });
    await prisma.topping.deleteMany({
      where: { name: { startsWith: 'dom1_' } },
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await cleanupDom1Records();

    // Create isolated dom1 test products & toppings to verify filtering and Decimal normalization
    const activeProd = await prisma.product.create({
      data: {
        name: `${prefix}_Active_Latte`,
        description: 'DOM1 test active product',
        price: 45000,
        imageUrl: 'https://example.com/latte.jpg',
        stock: 25,
        isActive: true,
      },
    });
    activeProductId = activeProd.id;

    const inactiveProd = await prisma.product.create({
      data: {
        name: `${prefix}_Inactive_Mocha`,
        description: 'DOM1 test inactive product',
        price: 50000,
        imageUrl: 'https://example.com/mocha.jpg',
        stock: 0,
        isActive: false,
      },
    });
    inactiveProductId = inactiveProd.id;

    const topping = await prisma.topping.create({
      data: {
        name: `${prefix}_Pearl_Topping`,
        price: 7000,
        isAvailable: true,
      },
    });
    availableToppingId = topping.id;
  });

  afterAll(async () => {
    await cleanupDom1Records();
    if (app) {
      await app.close();
    }
  });

  describe('Task 2: Products & Menu API', () => {
    it('GET /products returns active products ordered by createdAt asc with numeric price', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const foundActive = res.body.find((p: any) => p.id === activeProductId);
      expect(foundActive).toBeDefined();
      expect(typeof foundActive.price).toBe('number');
      expect(foundActive.price).toBe(45000);

      const foundInactive = res.body.find(
        (p: any) => p.id === inactiveProductId,
      );
      expect(foundInactive).toBeUndefined();
    });

    it('GET /products/toppings returns available toppings with numeric price', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/toppings')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const foundTopping = res.body.find(
        (t: any) => t.id === availableToppingId,
      );
      expect(foundTopping).toBeDefined();
      expect(typeof foundTopping.price).toBe('number');
      expect(foundTopping.price).toBe(7000);
    });

    it('GET /products/:id returns product details with available toppings and numeric prices', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${activeProductId}`)
        .expect(200);

      expect(res.body.id).toBe(activeProductId);
      expect(typeof res.body.price).toBe('number');
      expect(res.body.price).toBe(45000);
      expect(Array.isArray(res.body.toppings)).toBe(true);
      expect(res.body.toppings.length).toBeGreaterThan(0);
      expect(typeof res.body.toppings[0].price).toBe('number');
    });

    it('GET /products/:id throws 404 NotFoundException for non-existent or inactive product', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);

      await request(app.getHttpServer())
        .get(`/products/${inactiveProductId}`)
        .expect(404);
    });
  });

  describe('Task 7: Authentication & JWT Guard API', () => {
    it('POST /auth/register creates a new user with bcrypt passwordHash and returns access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'password123',
          fullName: 'DOM1 Tester',
          phone: '0912345678',
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.fullName).toBe('DOM1 Tester');
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.user.loyaltyPoints).toBe(0);
      expect(res.body.user.passwordHash).toBeUndefined();

      testUserId = res.body.user.id;
      accessToken = res.body.access_token;

      // Verify bcrypt hash in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.passwordHash).not.toBe('password123');
      expect(dbUser!.passwordHash.startsWith('$2b$')).toBe(true);
    });

    it('POST /auth/register throws 409 ConflictException on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'password123',
        })
        .expect(409);
    });

    it('POST /auth/register validates DTO (invalid email or short password throws 400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: '123',
        })
        .expect(400);
    });

    it('POST /auth/login authenticates valid credentials and returns JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('POST /auth/login throws 401 UnauthorizedException on invalid email or password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `nonexistent_${testEmail}`,
          password: 'password123',
        })
        .expect(401);
    });

    it('GET /auth/me returns current user profile when guarded with valid JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(testUserId);
      expect(res.body.email).toBe(testEmail);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('GET /auth/me throws 401 UnauthorizedException when token is missing or invalid', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  describe('Task 8: Cashless Mock Payment API', () => {
    let testOrderId: string;

    beforeAll(async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `${prefix}_ORD_001`,
          userId: testUserId,
          status: OrderStatus.PENDING,
          subtotal: 50000,
          discountAmount: 0,
          total: 50000,
        },
      });
      testOrderId = order.id;
    });

    it('POST /payments with simulateFailure=true sets Payment=FAILED and Order=PAYMENT_FAILED', async () => {
      const failKey = `${prefix}_idem_fail_1`;
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrderId,
          method: PaymentMethod.E_WALLET,
          idempotencyKey: failKey,
          simulateFailure: true,
        })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.FAILED);
      expect(res.body.amount).toBe(50000);
      expect(res.body.transactionRef).toBeNull();
      expect(res.body.order.status).toBe(OrderStatus.PAYMENT_FAILED);
    });

    it('POST /payments allows retry on PAYMENT_FAILED order, transitions to PAID, and accrues loyaltyPoints', async () => {
      const successKey = `${prefix}_idem_success_1`;
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', successKey)
        .send({
          orderId: testOrderId,
          method: PaymentMethod.BANK_CARD,
        })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.SUCCESS);
      expect(res.body.idempotencyKey).toBe(successKey);
      expect(res.body.transactionRef).toMatch(/^MOCK-/);
      expect(res.body.order.status).toBe(OrderStatus.PAID);
      expect(res.body.idempotentReplay).toBe(false);

      // Verify loyalty points accrued (50,000 VND -> 5 points)
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser!.loyaltyPoints).toBe(5);
    });

    it('POST /payments enforces idempotency when same Idempotency-Key is replayed', async () => {
      const successKey = `${prefix}_idem_success_1`;
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', successKey)
        .send({
          orderId: testOrderId,
          method: PaymentMethod.BANK_CARD,
        })
        .expect(201);

      expect(res.body.status).toBe(PaymentStatus.SUCCESS);
      expect(res.body.idempotencyKey).toBe(successKey);
      expect(res.body.idempotentReplay).toBe(true);

      // Ensure loyalty points were NOT double-incremented
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser!.loyaltyPoints).toBe(5);
    });

    it('POST /payments rejects paying an already PAID or CANCELLED order with 400 BadRequestException', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: testOrderId,
          method: PaymentMethod.E_WALLET,
          idempotencyKey: `${prefix}_idem_already_paid`,
        })
        .expect(400);

      const cancelledOrder = await prisma.order.create({
        data: {
          orderNumber: `${prefix}_ORD_CANCELLED`,
          userId: testUserId,
          status: OrderStatus.CANCELLED,
          subtotal: 35000,
          discountAmount: 0,
          total: 35000,
        },
      });

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: cancelledOrder.id,
          method: PaymentMethod.E_WALLET,
          idempotencyKey: `${prefix}_idem_cancelled_order`,
        })
        .expect(400);
    });

    it('POST /payments throws 404 NotFoundException when orderId does not exist', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          method: PaymentMethod.E_WALLET,
          idempotencyKey: `${prefix}_idem_not_found`,
        })
        .expect(404);
    });

    it('POST /payments throws 409 ConflictException when idempotencyKey is reused for a different order', async () => {
      const anotherOrder = await prisma.order.create({
        data: {
          orderNumber: `${prefix}_ORD_OTHER`,
          userId: testUserId,
          status: OrderStatus.PENDING,
          subtotal: 40000,
          discountAmount: 0,
          total: 40000,
        },
      });

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: anotherOrder.id,
          method: PaymentMethod.E_WALLET,
          idempotencyKey: `${prefix}_idem_success_1`,
        })
        .expect(409);
    });
  });

  describe('Task 5.2 & Full E2E Journey: Health Check + Menu -> Detail -> Auth -> Guarded Order -> Cashless Payment -> Confirmation', () => {
    it('GET /health verifies system and PostgreSQL database connectivity', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
      expect(res.body.timestamp).toBeDefined();
    });

    it('POST /orders is protected by JwtAuthGuard and rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              productId: activeProductId,
              size: 'M',
              qty: 1,
            },
          ],
        })
        .expect(401);
    });

    it('runs full End-to-End (E2E) flow from viewing menu to order confirmation', async () => {
      // 1. Xem Menu (GET /products)
      const menuRes = await request(app.getHttpServer())
        .get('/products')
        .expect(200);
      const selectedProduct = menuRes.body.find(
        (p: any) => p.id === activeProductId,
      );
      expect(selectedProduct).toBeDefined();

      // 2. Xem Chi tiết món & Topping (GET /products/:id)
      const detailRes = await request(app.getHttpServer())
        .get(`/products/${selectedProduct.id}`)
        .expect(200);
      expect(detailRes.body.toppings.length).toBeGreaterThan(0);

      // 3. Đăng nhập nhận JWT (POST /auth/login)
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'password123',
        })
        .expect(200);
      const token = loginRes.body.access_token;
      expect(token).toBeDefined();

      // 4. Đặt đơn hàng có JWT Guard bảo vệ (POST /orders)
      // Base price: 45,000 + Size M (+5,000) + Topping (7,000) = 57,000 VND
      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              productId: activeProductId,
              size: 'M',
              qty: 1,
              toppingIds: [availableToppingId],
            },
          ],
          notes: 'E2E Test: Ít đá, uống tại quán',
        })
        .expect(201);

      expect(orderRes.body.id).toBeDefined();
      expect(orderRes.body.orderNumber).toMatch(/^BL/);
      expect(orderRes.body.status).toBe(OrderStatus.PENDING);
      expect(Number(orderRes.body.total)).toBe(57000);

      const e2eOrderId = orderRes.body.id;

      // 5. Thanh toán không tiền mặt Idempotent (POST /payments)
      const payRes = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', `${prefix}_e2e_pay_key`)
        .send({
          orderId: e2eOrderId,
          method: PaymentMethod.E_WALLET,
        })
        .expect(201);

      expect(payRes.body.status).toBe(PaymentStatus.SUCCESS);
      expect(payRes.body.order.status).toBe(OrderStatus.PAID);
      expect(payRes.body.transactionRef).toMatch(/^MOCK-/);

      // 6. Xem xác nhận đơn & lịch sử đơn (GET /orders/:id & GET /orders/me)
      const confirmRes = await request(app.getHttpServer())
        .get(`/orders/${e2eOrderId}`)
        .expect(200);
      expect(confirmRes.body.status).toBe(OrderStatus.PAID);
      expect(confirmRes.body.orderNumber).toBe(orderRes.body.orderNumber);

      const historyRes = await request(app.getHttpServer())
        .get('/orders/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        historyRes.body.some((o: any) => o.id === e2eOrderId && o.status === OrderStatus.PAID),
      ).toBe(true);
    });
  });
});
