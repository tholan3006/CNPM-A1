import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { OrderLifecycleService } from './order-lifecycle.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderLifecycleService: OrderLifecycleService,
  ) {}

  /**
   * Lấy danh sách đơn hàng của toàn bộ quán (cho Barista / Quản lý)
   */
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả đơn hàng quán (Barista)' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng của quán' })
  async getAllOrders(@Query('status') status?: OrderStatus) {
    return this.ordersService.getAllOrders(status);
  }

  /**
   * Task 6 & Task 7: POST /orders
   * Tạo đơn hàng mới từ giỏ hàng (Bảo vệ bởi JwtAuthGuard)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo đơn hàng mới (Task 6 - Yêu cầu JWT Guard Task 7)' })
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(this.getUserId(req), dto);
  }

  /**
   * Task 9: GET /orders/me
   * Lấy lịch sử đơn hàng của người dùng hiện tại (Nếu Barista/Admin sẽ lấy tất cả)
   */
  @Get('me')
  @ApiOperation({ summary: 'Lấy danh sách lịch sử đơn hàng của người dùng hiện tại (Task 9)' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng được sắp xếp mới nhất' })
  async getMyOrders(
    @Req() req: any,
    @Query('userId') userIdQuery?: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-dev-user-id') devUserIdHeader?: string,
  ) {
    let tokenSub: string | undefined;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(authHeader.split(' ')[1].split('.')[1], 'base64').toString());
        tokenSub = payload?.sub || payload?.id || payload?.userId;
      } catch {}
    }
    const fromJwt = req.user?.id ?? req.user?.userId ?? req.user?.sub ?? tokenSub;
    const effectiveUserId = fromJwt || userIdHeader || devUserIdHeader || userIdQuery;
    if (!effectiveUserId) {
      return [];
    }
    return this.ordersService.getMyOrders(effectiveUserId);
  }

  /**
   * Cập nhật trạng thái đơn hàng theo State Machine (Task 10.1)
   * Barista: PAID -> PREPARING -> READY
   * Khách hàng: READY -> COMPLETED
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Chuyển trạng thái đơn hàng theo State Machine (Task 10.1)' })
  @ApiResponse({ status: 200, description: 'Chuyển trạng thái thành công' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderLifecycleService.transition(id, status);
  }

  /**
   * Xem chi tiết đơn hàng theo ID hoặc Order Number (#BL-...)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một đơn hàng theo ID hoặc Mã đơn' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  private getUserId(req: any): string {
    const fromJwt = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    if (fromJwt) return fromJwt;

    if (req.headers['x-user-id']) {
      return String(req.headers['x-user-id']);
    }

    if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-user-id']) {
      return String(req.headers['x-dev-user-id']);
    }
    throw new UnauthorizedException('Vui lòng đăng nhập để đặt đơn');
  }
}
