import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const COLLECTIONS = ['uplinkmessages', 'enddevices', 'gateways', 'applications', 'integrations', 'users', 'companies'];

@Injectable()
export class StorageService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async getStats() {
    const db = this.connection.db;
    const dbStats: any = await db.command({ dbStats: 1, scale: 1 });

    const collectionStats = await Promise.all(
      COLLECTIONS.map(async (name) => {
        try {
          const stats: any = await db.command({ collStats: name, scale: 1 });
          return {
            name,
            storageSize: stats.storageSize ?? 0,
            dataSize: stats.size ?? 0,
            count: stats.count ?? 0,
          };
        } catch {
          return { name, storageSize: 0, dataSize: 0, count: 0 };
        }
      }),
    );

    const totalSize: number = dbStats.dataSize + dbStats.indexSize;
    const storageSize: number = dbStats.storageSize ?? totalSize;

    return {
      totalSize,
      storageSize,
      dataSize: dbStats.dataSize,
      indexSize: dbStats.indexSize,
      collections: collectionStats,
    };
  }
}
