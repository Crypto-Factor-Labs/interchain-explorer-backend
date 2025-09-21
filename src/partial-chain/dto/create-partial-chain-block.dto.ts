import { IsString, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartialChainBlockDto {
  @IsNumber()
  chain_id!: number;

  @IsString() // decimal string; convert to BN in service
  height!: string;

  @IsString()
  block_hash!: string;

  @IsString()
  master_block_hash!: string;

  @IsNumber()
  mempool_epoch!: number;

  @IsString()
  txn_root!: string;

  @IsString()
  source_txn_hash!: string;

  @IsString()
  commit_txn_hash!: string;

  @IsString()
  commit_proof!: string;

  @IsBoolean()
  confirmed!: boolean;

  @IsDate()
  @Type(() => Date)
  indexed_at!: Date;
}
