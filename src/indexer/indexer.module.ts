import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { IndexerLock } from '../storage/entities/indexer-lock.entity.js';  // Import IndexerLock entity
import { IndexerService } from './indexer.service.js';
import { ScheduledIndexerService } from './scheduled-indexer.service.js';  // Scheduled Job
import { PartisiaModule } from '../partisia/partisia.module.js';
import { MasterChainModule } from '../master-chain/master-chain.module.js';
import { PartialChainModule } from '../partial-chain/partial-chain.module.js';

@Module({
  imports: [StorageModule, PartisiaModule, MasterChainModule, PartialChainModule, TypeOrmModule.forFeature([IndexerLock])],
  providers: [IndexerService, ScheduledIndexerService],
  exports: [IndexerService]
})
export class IndexerModule { }
