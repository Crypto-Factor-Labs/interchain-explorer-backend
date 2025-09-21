import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import type { MasterChainBlockEntity } from './master-chain-block.entity.js';
import BN from 'bn.js';

@Entity('partial_chain_blocks')
@Unique(['chain_id', 'height']) // chain_id + height unique
export class PartialChainBlockEntity {
  @Column('int')
  chain_id!: number;

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

  @PrimaryColumn('text')
  block_hash!: string; // PK

  @Column('text')
  master_block_hash!: string; // FK to master_chain_blocks.block_hash

  @Column('int')
  mempool_epoch!: number;

  @Column('text')
  txn_root!: string;

  @Column('text')
  source_txn_hash!: string;

  @Column('text')
  commit_txn_hash!: string;

  @Column('text')
  commit_proof!: string;

  @Column('boolean', { default: false })
  confirmed!: boolean;

  @Column('timestamptz')
  indexed_at!: Date;

  @ManyToOne(
    'MasterChainBlockEntity',
    (master: MasterChainBlockEntity) => master.partialBlocks,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'master_block_hash', referencedColumnName: 'block_hash' })
  masterBlock!: MasterChainBlockEntity;
}
