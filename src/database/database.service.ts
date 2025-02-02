import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { MasterChainBlock } from './entities/master-chain-block.entity';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectRepository(MasterChainBlock)
    private readonly masterChainBlockRepository: Repository<MasterChainBlock>,
    private readonly dataSource: DataSource, // Inject the DataSource
  ) { }

  // Lifecycle hook to verify the database connection when the module initializes
  async onModuleInit() {
    try {
      // Use the injected DataSource to perform a query to ensure everything works
      await this.dataSource.query('SELECT 1');
      this.logger.log('>>> Database connection established and verified successfully.');
    } catch (error) {
      // Type guard to check if the error is an instance of Error
      if (error instanceof Error) {
        this.logger.error('Failed to verify database connection', error.stack);
      } else {
        this.logger.error('Failed to verify database connection, unknown error');
      }
      throw new Error('Database connection verification failed');
    }
  }

  // Example method to fetch blocks
  async findAllMasterChainBlocks(): Promise<MasterChainBlock[]> {
    return this.masterChainBlockRepository.find();
  }

  async getGreatestHeight(): Promise<number> {
    const block = await this.masterChainBlockRepository.findOne({
      where: {},
      select: ['height'],
      order: { height: 'DESC' },
    });

    return block ? block.height : 0;
  }

  // Add more database-related methods here
}
