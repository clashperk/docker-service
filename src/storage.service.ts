import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db } from 'mongodb';
import { CreateServiceInput, ServicesEntity } from './app.dto';
import { Tokens } from './app.providers';

@Injectable()
export class StorageService {
  private collection: Collection<ServicesEntity>;

  constructor(@Inject(Tokens.MONGODB) db: Db) {
    this.collection = db.collection('applications');
  }

  async findById(serviceId: string) {
    return this.collection.findOne({ serviceId });
  }

  async findByContainerId(containerId: string) {
    return this.collection.findOne({ containerId });
  }

  async createService(input: CreateServiceInput, containerId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId: input.serviceId },
      {
        $set: {
          ...input,
          isRunning: false,
          isProd: false,
        },
        $setOnInsert: {
          containerId,
        },
      },
      {
        returnDocument: 'before',
        upsert: true,
      },
    );
  }

  async updateProdMode(serviceId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { isProd: true } },
      { returnDocument: 'after' },
    );
  }

  async updateContainerId(serviceId: string, containerId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { containerId, isRunning: true } },
      { returnDocument: 'after' },
    );
  }

  async getAllServices() {
    return this.collection.find({ isRunning: { $exists: false } }).toArray();
  }

  async stopService(serviceId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { isRunning: false } },
      { returnDocument: 'after' },
    );
  }
}
