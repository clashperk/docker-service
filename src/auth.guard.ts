import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;
  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow('API_KEY');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = req.headers?.['x-api-key'] || req.query?.key;
    if (key !== this.apiKey) throw new UnauthorizedException();
    return true;
  }
}
