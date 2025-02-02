import { Module } from '@nestjs/common';
import { IndexerCommand } from './indexer.command';  // Import the CLI Command
import { IndexerService } from './indexer.service';
import { ScheduledIndexerService } from './scheduled-indexer.service';    // Import scheduled task
import { MasterChainModule } from '../master-chain/master-chain.module';  // Import MasterChainModule to use its services

@Module({
  imports: [MasterChainModule],
  providers: [IndexerCommand, IndexerService, ScheduledIndexerService],
})
export class IndexerModule { }
