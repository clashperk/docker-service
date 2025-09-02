import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateServiceInput } from './app.dto';
import { AppService } from './app.service';
import { ApiKeyGuard } from './auth.guard';

@Controller()
@UsePipes(new ValidationPipe({ transform: true }))
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(ApiKeyGuard)
  @Post('/github-webhook')
  handleGitHubWebhook() {
    return this.appService.handleGitHubWebhook();
  }

  @UseGuards(ApiKeyGuard)
  @Post('/services')
  createService(@Body() input: CreateServiceInput) {
    return this.appService.deployService(input);
  }

  @UseGuards(ApiKeyGuard)
  @Post('/services/migrate')
  migrateServices() {
    return this.appService.migrateServices();
  }

  @UseGuards(ApiKeyGuard)
  @Put('/services/:id/upgrade')
  async upgradeService(@Param('id') serviceId: string) {
    return this.appService.upgradeToProd(serviceId);
  }

  @UseGuards(ApiKeyGuard)
  @Put('/services/:id/suspend')
  async suspendService(@Param('id') serviceId: string) {
    return this.appService.suspendService(serviceId);
  }

  @UseGuards(ApiKeyGuard)
  @Put('/services/:id/resume')
  async resumeService(@Param('id') serviceId: string) {
    return this.appService.resumeService(serviceId);
  }

  @UseGuards(ApiKeyGuard)
  @Delete('/services/:id')
  deleteService(@Param('id') serviceId: string) {
    return this.appService.deleteService(serviceId);
  }

  @UseGuards(ApiKeyGuard)
  @Get('/services')
  async getService() {
    return { payload: await this.appService.getAllServices() };
  }
}
