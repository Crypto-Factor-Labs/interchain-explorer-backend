import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandModule } from 'nestjs-command';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { IndexerModule } from './indexer/indexer.module';
import { MasterChainModule } from './master-chain/master-chain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Load environment variables
    CommandModule,             // For using the CLI
    ScheduleModule.forRoot(),  // For scheduling jobs
    DatabaseModule,            // Database configuration and entities
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