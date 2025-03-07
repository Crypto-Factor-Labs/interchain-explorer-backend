import { IsString, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer'; // For transforming values, e.g., strings to dates

export class CreatePartialChainBlockDto {
  @IsNumber()
  height!: string;

  @IsString()
  blockHash!: string;  // Primary Key

  @IsString()
  masterBlockHash!: string;  // Foreign Key to table `master_chain_blocks`

  @IsNumber()
  mempoolEpoch!: number;

  @IsString()
  txnRoot!: string;

  @IsString()
  sourceTxnHash!: string;

  @IsString()
  commitTxnHash!: string;

  @IsString()
  commitProof!: string;

  @IsBoolean()
  confirmed!: boolean;

  @IsDate()
  @Type(() => Date)  // Use class-transformer to convert string to Date
  indexed_at!: Date;
}
