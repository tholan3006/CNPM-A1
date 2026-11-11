import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['', 'api'])
  @ApiOperation({ summary: 'Kiểm tra trạng thái máy chủ (Task 1: Hello World)' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  getHello() {
    return this.appService.getHello();
  }

  @Get(['health', 'api/health'])
  @ApiOperation({ summary: 'Kiểm tra sức khỏe hệ thống & kết nối Database (Task 5.2: GET /health)' })
  @ApiResponse({ status: 200, description: 'Database và API hoạt động ổn định' })
  getHealth() {
    return this.appService.getHealth();
  }
}
