import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './storage/storage.module.js';
import { IndexerModule } from './indexer/indexer.module.js';
import { MasterChainModule } from './master-chain/master-chain.module.js';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({ // Load environment variables
      isGlobal: true,
      // Validate the variables
      validationSchema: Joi.object({
        DB_PORT: Joi.number().min(1).max(65535).default(5432),
        APP_PORT: Joi.number().min(1).max(65535).default(3000),
      }),
    }),
    ScheduleModule.forRoot(),  // For scheduling jobs
    StorageModule,             // Storage configuration and entities
    IndexerModule,             // Indexer functionality
    MasterChainModule,         // MasterChain Business Logic and Controller
    // Add other feature modules here as needed (e.g., PartialChainModule)
  ],
})
export class AppModule { }
