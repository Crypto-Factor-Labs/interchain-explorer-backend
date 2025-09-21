import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';  // Import Cron decorator
import { IndexerService } from './indexer.service.js';

@Injectable()
export class ScheduledIndexerService {
  constructor(private readonly indexerService: IndexerService) { }

  // Schedule a Job to run periodically
  @Cron(CronExpression.EVERY_MINUTE) // Cron expression for every minute
  async indexBlocks() {
    //await this.indexerService.dummyJob();
    await this.indexerService.indexBlocks();
    //console.log('>>> Scheduled Job ran to index new blocks!');
  }
}
