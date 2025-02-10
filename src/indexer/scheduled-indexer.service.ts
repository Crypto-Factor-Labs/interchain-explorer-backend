import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';  // Import Cron decorator
import { IndexerService } from './indexer.service.js';

@Injectable()
export class ScheduledIndexerService {
  constructor(private readonly indexerService: IndexerService) { }

  // Schedule a task to run periodically
  @Cron(CronExpression.EVERY_MINUTE) // Cron expression for every minute
  async indexBlocks() {
    //await this.indexerService.dummyTask();
    await this.indexerService.indexBlocks();
    console.log('>>> Scheduled task ran to index new blocks!');
  }
}
