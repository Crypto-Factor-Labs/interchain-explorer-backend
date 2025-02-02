import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MasterChainService } from '../master-chain/master-chain.service';
import { CreateMasterChainBlockDto } from '../master-chain/dto/create-master-chain-block.dto';

@Injectable()
export class IndexerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly masterChainService: MasterChainService,
  ) { }

  // TEMP: Generate a unique height as increment from the maximum height that is present in the database
  async generateUniqueHeight(): Promise<number> {
    const greatestHeight = await this.databaseService.getGreatestHeight();  // Get the greatest height from the database
    return greatestHeight + 1;
  }

  // Centralized method to generate block data
  async generateBlockData(): Promise<CreateMasterChainBlockDto> {
    return {
      height: await this.generateUniqueHeight(),  // TEMP: Generate a random value for now
      timestamp: new Date(),
      merkle_root: 'some-merkle-root',
      block_hash: randomUUID(),                   // TEMP: Generate a random value for now
      block_mint_transaction: randomUUID(),       // TEMP: Generate a random value for now
      date_indexed: new Date(),
    };
  }

  // Manually trigger indexBlock
  async indexBlockManually() {
    const blockData = await this.generateBlockData();
    await this.indexBlock(blockData);
    console.log('>>> Manually indexed a new block!');
  }

  // Example method where the Indexer logic runs and creates a MasterChainBlock
  async indexBlock(blockData: CreateMasterChainBlockDto): Promise<void> {
    await this.masterChainService.createMasterChainBlock(blockData);
    console.log('>>> MasterChainBlock created successfully');
  }
}
