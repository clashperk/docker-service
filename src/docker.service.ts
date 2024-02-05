import { type ECR } from '@aws-sdk/client-ecr';
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Dockerode from 'dockerode';
import { envKeys } from './app.constants';
import { Tokens } from './app.providers';

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly envConfig: string[];
  private readonly registryId: string;
  private readonly repoTag: string;

  constructor(
    @Inject(Tokens.DOCKER) private readonly docker: Dockerode,
    @Inject(Tokens.ECR) private readonly ecr: ECR,
    private configService: ConfigService,
  ) {
    this.registryId = this.configService.getOrThrow('AWS_ECR_REGISTRY_ID');

    this.repoTag = this.configService.getOrThrow('AWS_ECR_REPOSITORY');

    this.envConfig = envKeys.map(
      (KEY) => `${KEY}=${this.configService.getOrThrow(`SHARED_ENV_${KEY}`)}`,
    );
  }

  async getContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((container) => ({
      id: container.Id,
      name: container.Names.join(', '),
      image: container.Image,
      status: container.State,
    }));
  }

  async pullImage() {
    const token = await this.ecr.getAuthorizationToken({
      registryIds: [this.registryId],
    });

    const authInfo = token.authorizationData?.at(0);
    if (!authInfo?.authorizationToken)
      throw new InternalServerErrorException('ECR authentication failed');

    this.logger.log('ERC authentication successful');

    const [username, password] = Buffer.from(authInfo.authorizationToken, 'base64')
      .toString()
      .split(':');

    this.logger.log('ERC authentication token extracted');

    const auth = { password, username, serveraddress: authInfo.proxyEndpoint };
    const dockerImageId = await this.inspect();

    const result = await new Promise<{ status: string }>((resolve, reject) => {
      this.docker.pull(
        this.repoTag,
        { authconfig: auth },
        (err: Error, stream: NodeJS.ReadableStream) => {
          const onFinished = (err: Error, output: any[]) => {
            if (err) reject(err);
            resolve(output.pop());
            this.logger.debug(output);
            this.logger.log('Latest docker image pulled');
          };

          const onProgress = (event: unknown) => {
            this.logger.debug(event);
          };

          if (err) reject(err);
          this.docker.modem.followProgress(stream, onFinished, onProgress);
        },
      );
    });

    if (result?.status) {
      this.logger.log(`Image ${result.status}`);
    }

    const latestDockerImageId = await this.inspect();
    if (!latestDockerImageId) return false;

    return dockerImageId !== latestDockerImageId;
  }

  private async inspect() {
    try {
      const inspected = await this.docker.getImage(this.repoTag).inspect();
      return inspected.Id;
    } catch {
      return null;
    }
  }

  async createContainer(name: string, extraEnv: string[]) {
    const container = await this.docker.createContainer({
      name,
      Image: this.repoTag,
      Env: [...this.envConfig, ...extraEnv],
      HostConfig: {
        Memory: 1024 * 1024 * 500,
        RestartPolicy: {
          Name: 'always',
        },
      },
    });
    this.logger.log(`Container [${name}] created`);

    await container.start();
    this.logger.log(`Container [${name}] started`);

    return container.id;
  }

  async deleteContainer(id: string) {
    await this.docker.getContainer(id).remove({ force: true });
    return id;
  }

  async stopContainer(id: string) {
    await this.docker.getContainer(id).stop();
    return id;
  }

  async deleteContainerByName(name: string) {
    const containers = await this.docker.listContainers({ all: true });
    const targetContainer = containers.find((container) => container.Names.includes(name));

    if (targetContainer) {
      await this.deleteContainer(targetContainer.Id);
    }

    return targetContainer?.Id ?? null;
  }
}
