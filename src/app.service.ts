import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import { DEPLOYMENT_QUEUE } from './app.constants';
import { CreateServiceInput } from './app.dto';
import { DockerService } from './docker.service';
import { StorageService } from './storage.service';

@Injectable()
export class AppService {
  private logger = new Logger(AppService.name);

  constructor(
    private dockerService: DockerService,
    private storageService: StorageService,
    @InjectQueue(DEPLOYMENT_QUEUE) private deploymentQueue: Queue,
  ) {}

  getHello(): string {
    return 'Hello World! This service is responsible for automatic deployments of our custom bots!';
  }

  async handleGitHubWebhook() {
    this.logger.log('Docker image pull request received');
    await this.deploymentQueue.add({}, { removeOnComplete: true, removeOnFail: true });
    return { message: 'OK' };
  }

  async pullImageAndDeployServices() {
    const pulled = await this.dockerService.pullImage();
    if (!pulled) return null;

    this.logger.log('Redeploying all services');

    return this.redeployServices();
  }

  async deployService(input: CreateServiceInput) {
    const existingService = await this.storageService.createService(input, 'pending_container_id');
    if (existingService) await this.stopService(existingService.serviceId);

    const containerName = this.serializedContainerName(input.name, input.serviceId);
    try {
      const containerId = await this.dockerService.createContainer(containerName, [
        `DISCORD_TOKEN=${input.token}`,
        `NODE_ENV=development`,
        `SERVICE_NAME=${containerName}`,
      ]);

      await this.storageService.updateContainerId(input.serviceId, containerId);
    } catch (error) {
      this.logger.error(error);
      this.clearOldContainer(containerName);
      throw error;
    }

    return { message: 'OK' };
  }

  async clearOldContainer(name: string) {
    this.logger.log(`Attempting to clear old container with the name "${name}"`);
    try {
      const id = await this.dockerService.deleteContainerByName(`/${name}`);
      if (id) this.logger.log('Old container cleared');
    } catch (error) {
      this.logger.error(error);
    }
  }

  async redeployService(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException();

    try {
      await this.dockerService.deleteContainer(service.containerId);
    } catch (error) {
      this.logger.log(`Service [${service.name}] deletion failed`);
      this.logger.error(error);
    }

    const containerName = this.serializedContainerName(service.name, service.serviceId);
    const containerId = await this.dockerService.createContainer(containerName, [
      `DISCORD_TOKEN=${service.token}`,
      `NODE_ENV=${service.isProd ? 'production' : 'development'}`,
      `SERVICE_NAME=${containerName}`,
    ]);
    await this.storageService.updateContainerId(service.serviceId, containerId);

    return { containerId };
  }

  async upgradeToProd(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException();

    await this.storageService.updateProdMode(serviceId);

    this.logger.log(`Service [${service.name}] upgrading to prod`);

    await this.redeployService(serviceId);

    return { message: 'OK' };
  }

  async stopService(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    try {
      await this.dockerService.deleteContainer(service.containerId);
    } catch (error) {
      this.logger.log(`Service [${service.name}] stop failed`);
      this.logger.error(error);
    }

    await this.storageService.stopService(serviceId);

    return { message: 'OK' };
  }

  async deleteService(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    try {
      await this.dockerService.deleteContainer(service.containerId);
    } catch (error) {
      this.logger.log(`Service [${service.name}] stop failed`);
      this.logger.error(error);
    }

    await this.storageService.stopService(serviceId);

    return { message: 'OK' };
  }

  async suspendService(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    await this.stopService(serviceId);
    await this.storageService.suspendService(serviceId);

    return { message: 'OK' };
  }

  async resumeService(serviceId: string) {
    const service = await this.storageService.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    await this.redeployService(service.serviceId);
    await this.storageService.resumeService(serviceId);

    return { message: 'OK' };
  }

  private async redeployServices() {
    const containers = await this.dockerService.getContainers();

    for (const container of containers) {
      const service = await this.storageService.findByContainerId(container.id);
      if (!service) continue;

      if (service.isDisabled) continue;

      try {
        await this.redeployService(service.serviceId);
      } catch (error) {
        this.logger.log(`Service [${service.name}] deployment failed`);
        this.logger.error(error);
      }

      this.logger.log(`Service [${service.name}] deployed`);

      await this.delay(5000);
    }

    this.logger.log('All services redeployed');
  }

  public async migrateServices() {
    const services = await this.storageService.getAllServices();

    for (const service of services) {
      if (service.isDisabled) continue;

      try {
        await this.dockerService.deleteContainer(service.containerId);
      } catch {}

      try {
        this.logger.log(`Migrating [${service.name}]`);

        const containerName = this.serializedContainerName(service.name, service.serviceId);
        const containerId = await this.dockerService.createContainer(containerName, [
          `DISCORD_TOKEN=${service.token}`,
          `NODE_ENV=${service.isProd ? 'production' : 'development'}`,
          `SERVICE_NAME=${containerName}`,
        ]);

        await this.storageService.updateContainerId(service.serviceId, containerId);
      } catch (error) {
        this.logger.error(error);
      }

      await this.delay(5000);
    }

    this.logger.log('All services migrated');
  }

  private serializedContainerName(name: string, serviceId: string) {
    return `${serviceId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
