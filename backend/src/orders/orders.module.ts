import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentProcessorService } from './payment-processor.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService, PaymentProcessorService],
  exports: [OrdersService, OrderLifecycleService, PaymentProcessorService],
})
export class OrdersModule {}
