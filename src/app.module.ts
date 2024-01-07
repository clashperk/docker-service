import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DEPLOYMENT_QUEUE } from './app.constants';
import { DeploymentConsumer } from './app.consumer';
import { AppController } from './app.controller';
import { DockerModule, ElasticContainerRegistryModule, MongoDbModule } from './app.providers';
import { AppService } from './app.service';
import { DockerService } from './docker.service';
import { StorageService } from './storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.services.env'] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          redis: {
            host: configService.getOrThrow<string>('REDIS_HOST'),
            port: configService.getOrThrow<number>('REDIS_PORT'),
            password: configService.getOrThrow<string>('REDIS_PASSWORD'),
            username: configService.getOrThrow<string>('REDIS_USERNAME'),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: DEPLOYMENT_QUEUE,
      settings: {
        lockDuration: 60 * 60 * 1000,
        stalledInterval: 0,
        maxStalledCount: 0,
      },
    }),
    DockerModule,
    ElasticContainerRegistryModule,
    MongoDbModule,
  ],
  controllers: [AppController],
  providers: [AppService, DockerService, StorageService, DeploymentConsumer],
})
export class AppModule {}
