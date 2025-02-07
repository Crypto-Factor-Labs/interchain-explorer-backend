import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './storage/storage.module.js';
import { IndexerModule } from './indexer/indexer.module.js';
import { MasterChainModule } from './master-chain/master-chain.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Load environment variables
    ScheduleModule.forRoot(),  // For scheduling jobs
    StorageModule,             // Storage configuration and entities
    IndexerModule,             // Indexer functionality
    MasterChainModule,         // MasterChain Business Logic and Controller
    // Add other feature modules here as needed (e.g., PartialChainModule)
  ],
})
export class AppModule { }


/* Original
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
 */