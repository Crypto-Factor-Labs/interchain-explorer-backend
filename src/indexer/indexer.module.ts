import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { IndexerService } from './indexer.service.js';
import { ScheduledIndexerService } from './scheduled-indexer.service.js';  // Scheduled task
import { PartisiaModule } from '../partisia/partisia.module.js';
import { MasterChainModule } from '../master-chain/master-chain.module.js';

@Module({
  imports: [StorageModule, PartisiaModule, MasterChainModule],
  providers: [IndexerService, ScheduledIndexerService],
})
export class IndexerModule { }
