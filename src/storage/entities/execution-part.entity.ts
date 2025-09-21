import {
  Entity, Index, Column, PrimaryGeneratedColumn,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
  JoinColumn,
  Relation
} from 'typeorm';
import type { PartialChainBlockEntity } from './partial-chain-block.entity.js';
import type { TransactionEntity } from './transaction.entity.js';

@Entity({ name: 'execution_parts' })
@Index('ux_exec_parts_txhash_partindex_isrevert', ['transactionHash', 'partIndex', 'isRevert'], { unique: true })
export class ExecutionPartEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'hash', type: 'text' })
  hash!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'transaction_hash', type: 'text' })
  transactionHash!: string;

  @Column({ name: 'part_index', type: 'integer', nullable: true })
  partIndex!: number | null; // from `transactionExecutionPartIndex` (null for reverts)

  @Column({ name: 'is_revert', type: 'boolean', default: false })
  isRevert!: boolean;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId!: number;

  @Column({ name: 'operator_address', type: 'text' })
  operatorAddress!: string;

  @Column({ name: 'sender_address', type: 'text' })
  senderAddress!: string;

  @Column({ name: 'included_in_partial_block', type: 'text', nullable: true })
  includedInPartialBlock!: string | null;

  @Column({ name: 'partial_block_part_index', type: 'integer', nullable: true })
  partialBlockPartIndex!: number | null;

  // Links to ChainEvents
  @Column({ name: 'target_sched_event_hash', type: 'text', nullable: true })
  targetSchedulingEventHash!: string | null;

  @Column({ name: 'target_publish_event_hash', type: 'text', nullable: true })
  targetPublishEventHash!: string | null;

  @Column({ name: 'target_exec_event_hash', type: 'text', nullable: true })
  targetExecutionEventHash!: string | null;

  @Column({ name: 'target_exec_result', type: 'smallint', nullable: true })
  targetExecutionResult!: number | null; // 0=pending,1=success,2=failed

  @Column({ name: 'mempool_commit_event_hash', type: 'text', nullable: true })
  mempoolCommitEventHash!: string | null;

  @Column({ name: 'mempool_epoch_consensus_proof', type: 'text', nullable: true })
  mempoolEpochConsensusProof!: string | null;

  @Column({ name: 'mempool_epoch_evm_proof', type: 'text', nullable: true })
  mempoolEpochEVMProof!: string | null;

  @ManyToOne(
    'TransactionEntity',
    (tx: TransactionEntity) => tx.executionParts,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'transaction_id', referencedColumnName: 'id' })
  transaction!: Relation<TransactionEntity>;

  // TEMPORARY, until a relation implemented
  partialBlock?: PartialChainBlockEntity | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
