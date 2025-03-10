import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { MasterChainBlockEntity } from './master-chain-block.entity.js';

@Entity('partial_chain_blocks')
@Unique(["chain_id", "height"])  // Unique constraint on chain_id and height

export class PartialChainBlockEntity {
  @Column('int')
  chain_id!: number;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  height!: number;

  @PrimaryColumn('text')
  block_hash!: string;  // Primary Key

  @Column('text')
  master_block_hash!: string;  // Foreign Key to table `master_chain_blocks`

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

  @Column('timestamp')
  created_at!: Date;

  // Define foreign key relationship with master_chain_blocks
  @ManyToOne(() => MasterChainBlockEntity)
  @JoinColumn({ name: 'master_block_hash', referencedColumnName: 'block_hash' })
  masterBlock!: MasterChainBlockEntity;
}
