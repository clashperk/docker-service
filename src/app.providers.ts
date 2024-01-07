import { ECR } from '@aws-sdk/client-ecr';
import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Dockerode from 'dockerode';
import { Db, MongoClient } from 'mongodb';

export const Tokens = {
  DOCKER: 'docker',
  ECR: 'ecr',
  MONGODB: 'mongodb',
} as const;

const DockerProvider: Provider = {
  provide: Tokens.DOCKER,
  useFactory: (): Dockerode => {
    return new Dockerode();
  },
  inject: [ConfigService],
};

@Module({
  providers: [DockerProvider],
  exports: [DockerProvider],
})
export class DockerModule {}

const ElasticContainerRegistryProvider: Provider = {
  provide: Tokens.ECR,
  useFactory: (configService: ConfigService) => {
    return new ECR({
      credentials: {
        accessKeyId: configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow('AWS_ACCESS_KEY_SECRET'),
      },
      region: 'us-east-1',
    });
  },
  inject: [ConfigService],
};

@Module({
  providers: [ElasticContainerRegistryProvider],
  exports: [ElasticContainerRegistryProvider],
})
export class ElasticContainerRegistryModule {}

const MongoDbProvider: Provider = {
  provide: Tokens.MONGODB,
  useFactory: async (configService: ConfigService): Promise<Db> => {
    const client = await MongoClient.connect(configService.getOrThrow('MONGODB_URL'));
    return client.db(configService.getOrThrow('MONGODB_DB_NAME'));
  },
  inject: [ConfigService],
};

@Module({
  providers: [MongoDbProvider],
  exports: [MongoDbProvider],
})
export class MongoDbModule {}
