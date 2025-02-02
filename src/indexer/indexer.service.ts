import { Injectable } from '@nestjs/common';
import { MasterChainService } from '../master-chain/master-chain.service';
import { CreateMasterChainBlockDto } from '../master-chain/dto/create-master-chain-block.dto';

@Injectable()
export class IndexerService {
  constructor(
    private readonly masterChainService: MasterChainService,
  ) { }

  // Centralized method to generate block data
  generateBlockData(): CreateMasterChainBlockDto {
    return {
      height: 12345,
      timestamp: new Date(),
      merkle_root: 'some-merkle-root',
      block_hash: 'some-block-hash',
      block_mint_transaction: 'some-transaction-hash',
      date_indexed: new Date(),
    };
  }

  // Manually trigger indexBlock
  async indexBlockManually() {
    const blockData = this.generateBlockData();
    await this.indexBlock(blockData);
    console.log('>>> Manually indexed a new block!');
  }

  // Example method where the Indexer logic runs and creates a MasterChainBlock
  async indexBlock(blockData: CreateMasterChainBlockDto): Promise<void> {
    await this.masterChainService.createMasterChainBlock(blockData);
    console.log('>>> MasterChainBlock created successfully');
  }
}
