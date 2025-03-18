import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import { PartialChainBlockEntity } from './partial-chain-block.entity.js';

@Entity('master_chain_blocks')  // Table name
export class MasterChainBlockEntity {

  @PrimaryColumn('text')
  block_hash!: string;  // Primary Key

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  height!: number;

  @Column('timestamp')
  timestamp!: Date;

  @Column('text')
  merkle_root!: string;

  @Column('text')
  block_mint_transaction!: string;

  @Column('timestamp')
  indexed_at!: Date;

  // Add the OneToMany relationship with PartialChainBlockEntity
  @OneToMany(() => PartialChainBlockEntity, (partialBlock) => partialBlock.masterBlock)
  partialBlocks!: PartialChainBlockEntity[];
}
