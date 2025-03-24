import { IsString, IsNumber, IsDate } from 'class-validator';  // Import class-validator decorators
import { Type } from 'class-transformer'; // For transforming values, e.g., strings to dates
import BN from 'bn.js';

export class CreateMasterChainBlockDto {
  @IsNumber()
  height!: BN;

  @IsString()
  block_hash!: string;  // Primary Key

  @IsDate()
  @Type(() => Date)  // Use class-transformer to convert string to Date
  timestamp!: Date;

  @IsString()
  merkle_root!: string;

  @IsString()
  block_mint_transaction!: string;

  @IsDate()
  @Type(() => Date)
  indexed_at!: Date;
}
