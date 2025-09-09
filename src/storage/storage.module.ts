import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { IndexerLockRepository } from './repositories/indexer-lock.repository.js';
import { IndexerLockEntity } from './entities/indexer-lock.entity.js';

import { MC_BLOCK_REPO } from './repositories/master-chain-block.repository.js';
import { MasterChainBlockPostgresRepository } from './repositories/master-chain-block-postgres.repository.js';
import { MasterChainBlockEntity } from './entities/master-chain-block.entity.js';

import { PC_BLOCK_REPO } from './repositories/partial-chain-block.repository.js';
import { PartialChainBlockPostgresRepository } from './repositories/partial-chain-block-postgres.repository.js';
import { PartialChainBlockEntity } from './entities/partial-chain-block.entity.js';

import { TX_REPO } from './repositories/transaction.repository.js';
import { TransactionPostgresRepository } from './repositories/transaction-postgres.repository.js';
import { TransactionEntity } from './entities/transaction.entity.js';

import { EXEC_PART_REPO } from './repositories/execution-part.repository.js';
import { ExecutionPartPostgresRepository } from './repositories/execution-part-postgres.repository.js';
import { ExecutionPartEntity } from './entities/execution-part.entity.js';

import { CHAIN_EVENT_REPO } from './repositories/chain-event.repository.js';
import { ChainEventPostgresRepository } from './repositories/chain-event-postgres.repository.js';
import { ChainEventEntity } from './entities/chain-event.entity.js';

import { CfrPriceHistoryRepository } from './repositories/cfr-price-history.repository.js';
import { CfrPriceHistoryEntity } from './entities/cfr-price-history.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexerLockEntity, MasterChainBlockEntity, PartialChainBlockEntity,
      TransactionEntity, ExecutionPartEntity, ChainEventEntity, CfrPriceHistoryEntity]),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [IndexerLockEntity, MasterChainBlockEntity, PartialChainBlockEntity, CfrPriceHistoryEntity],
          synchronize: false, // Should be false in production
        };
      },
      inject: [ConfigService], // Inject ConfigService to resolve environment variables
    }),
  ],
  providers: [
    IndexerLockRepository,
    { provide: MC_BLOCK_REPO, useClass: MasterChainBlockPostgresRepository },
    { provide: PC_BLOCK_REPO, useClass: PartialChainBlockPostgresRepository },
    { provide: TX_REPO, useClass: TransactionPostgresRepository },
    { provide: EXEC_PART_REPO, useClass: ExecutionPartPostgresRepository },
    { provide: CHAIN_EVENT_REPO, useClass: ChainEventPostgresRepository },
    CfrPriceHistoryRepository,
  ],
  exports: [IndexerLockRepository, MC_BLOCK_REPO, PC_BLOCK_REPO,
    TX_REPO, EXEC_PART_REPO, CfrPriceHistoryRepository],
})

// Lifecycle hook to verify the database connection when the module initializes
export class StorageModule implements OnModuleInit {
  private readonly logger = new Logger(StorageModule.name);

  constructor(private readonly dataSource: DataSource) { }

  async onModuleInit() {
    try {
      await this.dataSource.query('SELECT 1'); // Verify database connection
      this.logger.log(' ✅ Database connection established and verified successfully.');
    } catch (error) {
      this.logger.error(
        'Failed to verify database connection',
        error instanceof Error ? error.stack : 'Unknown error'
      );
      throw new Error('Database connection verification failed');
    }
  }
}
