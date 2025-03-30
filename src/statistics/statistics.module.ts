import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { StatisticsService } from './statistics.service.js';
import { StatisticsController } from './statistics.controller.js';

@Module({
  imports: [StorageModule],
  providers: [StatisticsService],
  controllers: [StatisticsController],
})
export class StatisticsModule { }
