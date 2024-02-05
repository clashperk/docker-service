import { IsNotEmpty } from 'class-validator';

export class ServicesEntity {
  serviceId: string;

  name: string;

  token: string;

  isRunning: boolean;

  isProd: boolean;

  containerId: string;

  isDisabled: boolean;
}

export class CreateServiceInput {
  @IsNotEmpty()
  serviceId: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  token: string;
}
