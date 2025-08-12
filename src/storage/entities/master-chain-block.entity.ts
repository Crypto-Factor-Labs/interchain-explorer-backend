import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import type { PartialChainBlockEntity } from './partial-chain-block.entity.js';
import BN from 'bn.js';

@Entity('master_chain_blocks')
export class MasterChainBlockEntity {
  @PrimaryColumn('text')
  block_hash!: string;

  @Column({
    type: 'numeric',
    precision: 78,
    scale: 0,
    transformer: {
      to: (value: BN): string => value.toString(10),   // DB gets decimal string
      from: (value: string): BN => new BN(value, 10),  // app gets BN
    },
  })
  height!: BN;

  @Column('timestamptz')
  timestamp!: Date;

  @Column('text')
  merkle_root!: string;

  @Column('text')
  block_mint_transaction!: string;

  @Column('timestamptz')
  indexed_at!: Date;

  @OneToMany(
    'PartialChainBlockEntity',
    (partial: PartialChainBlockEntity) => partial.masterBlock,
  )
  partialBlocks!: PartialChainBlockEntity[];
}
