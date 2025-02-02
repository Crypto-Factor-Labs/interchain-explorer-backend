import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';  // Import Cron decorator
import { IndexerService } from './indexer.service';

@Injectable()
export class ScheduledIndexerService {
  constructor(private readonly indexerService: IndexerService) { }

  // Schedule a task to run periodically
  @Cron('*/1 * * * *') // Cron expression for every minute
  async indexBlock() {
    const blockData = this.indexerService.generateBlockData();
    await this.indexerService.indexBlock(blockData);
    console.log('>>> Scheduled task ran and indexed a new block!');
  }
}
