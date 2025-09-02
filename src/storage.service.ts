import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db } from 'mongodb';
import { CreateServiceInput, ServicesEntity } from './app.dto';
import { Tokens } from './app.providers';

@Injectable()
export class StorageService {
  private collection: Collection<ServicesEntity>;

  constructor(@Inject(Tokens.MONGODB) db: Db) {
    this.collection = db.collection('CustomBots');
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
          isDisabled: false,
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
    return this.collection.find({}).toArray();
  }

  async getActiveServices() {
    return this.collection
      .find({ $or: [{ isRunning: true }, { isDisabled: false }] })
      .project({
        name: 0,
        serviceId: 0,
        patronId: 0,
        userId: 0,
        updatedAt: 0,
        createdAt: 0,
      })
      .toArray();
  }

  async stopService(serviceId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { isRunning: false } },
      { returnDocument: 'after' },
    );
  }

  async deleteService(serviceId: string) {
    return this.collection.deleteOne({ serviceId });
  }

  async suspendService(serviceId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { isRunning: false, isDisabled: true } },
      { returnDocument: 'after' },
    );
  }

  async resumeService(serviceId: string) {
    return this.collection.findOneAndUpdate(
      { serviceId },
      { $set: { isRunning: true, isDisabled: false } },
      { returnDocument: 'after' },
    );
  }
}
