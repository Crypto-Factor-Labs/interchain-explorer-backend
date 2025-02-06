import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { IndexerCommand } from './indexer.command';  // Import CLI Command
import { IndexerService } from './indexer.service';
import { ScheduledIndexerService } from './scheduled-indexer.service';  // Scheduled task
import { PartisiaModule } from '../partisia/partisia.module';
import { MasterChainModule } from '../master-chain/master-chain.module';

@Module({
  imports: [StorageModule, PartisiaModule, MasterChainModule],
  providers: [IndexerCommand, IndexerService, ScheduledIndexerService],
})
export class IndexerModule { }
