import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from '../database/database.service';
import { IndexerCommand } from './indexer.command';  // Import the CLI Command
import { IndexerService } from './indexer.service';
import { ScheduledIndexerService } from './scheduled-indexer.service';    // Import scheduled task
import { MasterChainModule } from '../master-chain/master-chain.module';  // Import MasterChainModule to use its services
import { MasterChainBlock } from '../database/entities/master-chain-block.entity';

@Module({
  imports: [MasterChainModule,
    TypeOrmModule.forFeature([MasterChainBlock]),  // Register the MasterChainBlock repository for injection
  ],
  providers: [DatabaseService, IndexerCommand, IndexerService, ScheduledIndexerService],
})
export class IndexerModule { }
