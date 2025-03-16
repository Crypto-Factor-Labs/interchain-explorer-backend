import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IndexerLockRepository } from './repositories/indexer-lock.repository.js';
import { IndexerLock } from './entities/indexer-lock.entity.js';
import { MC_BLOCK_REPO } from './repositories/master-chain-block.repository.js';
import { MasterChainBlockPostgresRepository } from './repositories/master-chain-block-postgres.repository.js';
import { MasterChainBlockEntity } from './entities/master-chain-block.entity.js';
import { PC_BLOCK_REPO } from './repositories/partial-chain-block.repository.js';
import { PartialChainBlockPostgresRepository } from './repositories/partial-chain-block-postgres.repository.js';
import { PartialChainBlockEntity } from './entities/partial-chain-block.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([IndexerLock, MasterChainBlockEntity, PartialChainBlockEntity]),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [IndexerLock, MasterChainBlockEntity, PartialChainBlockEntity],
          synchronize: false, // Should be false in production
        };
      },
      inject: [ConfigService], // Inject ConfigService to resolve environment variables
    }),
  ],
  providers: [
    IndexerLockRepository,
    {
      provide: MC_BLOCK_REPO,
      useClass: MasterChainBlockPostgresRepository, // Default storage backend
    },
    {
      provide: PC_BLOCK_REPO,
      useClass: PartialChainBlockPostgresRepository, // Default storage backend
    },
  ],
  exports: [IndexerLockRepository, MC_BLOCK_REPO, PC_BLOCK_REPO],
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
