import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IndexerLockRepository } from './repositories/indexer-lock.repository.js';
import { IndexerLock } from './entities/indexer-lock.entity.js';
import { MASTER_CHAIN_BLOCK_REPOSITORY } from './repositories/master-chain-block.repository.js';
import { MasterChainBlockPostgresRepository } from './repositories/master-chain-block-postgres.repository.js';
import { MasterChainBlockEntity } from './entities/master-chain-block.entity.js';
// import { PartialChainBlock } from './entities/partial-chain-block.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Ensure ConfigModule is imported and global
    TypeOrmModule.forFeature([IndexerLock, MasterChainBlockEntity /*, PartialChainBlock*/]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule for dependency injection
      useFactory: async (configService: ConfigService) => {
        const dbPort = configService.get<string>('DB_PORT');
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: dbPort ? +dbPort : 5432,  // Use + to convert dbPort into a number, using 5432 as fallback
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [IndexerLock, MasterChainBlockEntity /*, PartialChainBlock*/],
          synchronize: false, // Should be false in production
        };
      },
      inject: [ConfigService], // Inject ConfigService to resolve environment variables
    }),
  ],
  providers: [
    IndexerLockRepository,
    {
      provide: MASTER_CHAIN_BLOCK_REPOSITORY,
      useClass: MasterChainBlockPostgresRepository, // Default storage backend
    },
  ],
  exports: [IndexerLockRepository, MASTER_CHAIN_BLOCK_REPOSITORY],
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
