import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './storage/storage.module.js';
import { IndexerModule } from './indexer/indexer.module.js';
import { ReaderNodeModule } from './reader-node/reader-node.module.js';
import { MasterChainModule } from './master-chain/master-chain.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';
import { ServicesModule } from './services/services.module.js';
import { DATA_SOURCE_OPTIONS } from './data-source.js';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({ // Load environment variables
      isGlobal: true,
      // Validate the variables
      validationSchema: Joi.object({
        DB_PORT: Joi.number().min(1).max(65535).default(5432),
        APP_PORT: Joi.number().min(1).max(65535).default(3000),
        READER_NODE_URL: Joi.string().uri().required(),
      }),
    }),
    TypeOrmModule.forRoot(DATA_SOURCE_OPTIONS),  // For triggering migration if applicable
    ScheduleModule.forRoot(),  // For scheduling jobs
    StorageModule,             // Storage configuration and entities
    IndexerModule,             // Indexer functionality
    ReaderNodeModule,          // ReaderNode interaction
    MasterChainModule,         // MasterChain Business Logic and Controller
    TransactionModule,         // Transaction Business Logic and Controller
    StatisticsModule,          // Statistics
    ServicesModule,
  ],
})
export class AppModule { }
