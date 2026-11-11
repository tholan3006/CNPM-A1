import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello() {
    return {
      status: 'success',
      message: 'Hello World! BrewLite API is running.',
      project: 'BrewLite - Digital Coffee & Cashless Payment',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        docs: '/api/docs',
        health: '/api/health',
        products: '/api/products',
        ordersMe: '/api/orders/me',
      },
    };
  }

  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'brewlite-backend',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'brewlite-backend',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
