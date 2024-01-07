import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DEPLOYMENT_QUEUE } from './app.constants';
import { AppService } from './app.service';

@Processor(DEPLOYMENT_QUEUE)
export class DeploymentConsumer {
  private logger = new Logger(DeploymentConsumer.name);

  constructor(private appService: AppService) {}

  @Process()
  async transcode(_job: Job<unknown>) {
    this.logger.log('Processing deployment job');

    await this.appService.pullImageAndDeployServices();

    this.logger.log('Deployment job successfully processed');
    return {};
  }
}
