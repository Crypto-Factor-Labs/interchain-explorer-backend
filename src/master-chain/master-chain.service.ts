import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterChainBlock } from '../database/entities/master-chain-block.entity';
import { CreateMasterChainBlockDto } from './dto/create-master-chain-block.dto';

@Injectable()
export class MasterChainService {
  constructor(
    @InjectRepository(MasterChainBlock)
    private readonly masterChainBlockRepository: Repository<MasterChainBlock>,
  ) { }

  async createMasterChainBlock(createMasterChainBlockDto: CreateMasterChainBlockDto): Promise<MasterChainBlock> {
    const masterChainBlock = this.masterChainBlockRepository.create(createMasterChainBlockDto);

    // Save the entity to the database
    return await this.masterChainBlockRepository.save(masterChainBlock);
  }

  async getLatestBlock(): Promise<MasterChainBlock> {
    try {
      const block = await this.masterChainBlockRepository
        .createQueryBuilder('block')     // Alias for the entity
        .orderBy('block.height', 'DESC') // Order by the height in descending order
        .getOne();                       // Retrieve a single block

      if (!block) {
        throw new Error('No block found');
      }

      return block;
    } catch (error) {
      console.error('Error fetching latest block:', error);
      throw new Error('Failed to retrieve latest block');
    }
  }

  // More service methods to interact with the Master Chain
}
