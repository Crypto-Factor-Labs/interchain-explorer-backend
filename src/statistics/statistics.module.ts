import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { StorageModule } from '../storage/storage.module.js';
import { ServicesModule } from '../services/services.module.js';
import { StatisticsService } from './statistics.service.js';
import { StatisticsController } from './statistics.controller.js';

@Module({
  imports: [StorageModule, ServicesModule,
    // Use a cache for the Statistics
    CacheModule.register({
      ttl: 60,  // seconds, default, is overridden per key
      max: 100, // maximum number of items in cache
    }),
  ],
  providers: [StatisticsService],
  controllers: [StatisticsController],
})
export class StatisticsModule { }
