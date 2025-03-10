import { IsString, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer'; // For transforming values, e.g., strings to dates

export class CreatePartialChainBlockDto {
  @IsNumber()
  chain_id!: number;

  @IsNumber()
  height!: number;

  @IsString()
  block_hash!: string;  // Primary Key

  @IsString()
  master_block_hash!: string;  // Foreign Key to table `master_chain_blocks`

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
  @Type(() => Date)  // Use class-transformer to convert string to Date
  created_at!: Date;
}
