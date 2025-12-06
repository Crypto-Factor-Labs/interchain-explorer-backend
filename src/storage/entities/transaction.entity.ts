import {
  Entity, Index, Column, PrimaryGeneratedColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn,
  Relation
} from 'typeorm';
import type { MasterChainBlockEntity } from './master-chain-block.entity.js';
import type { ExecutionPartEntity } from './execution-part.entity.js';

@Entity({ name: 'transactions' })
@Index('ux_transactions_tx_hash', ['transactionHash'], { unique: true })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_transactions_txhash', { unique: true })
  @Column({ name: 'transaction_hash', type: 'text' })
  transactionHash!: string;

  @Column({ name: 'source_sender', type: 'text' })
  sourceSender!: string;

  @Column({ name: 'source_chain_id', type: 'integer' })
  sourceChainId!: number;

  @Column({ name: 'source_chain_mempool_epoch', type: 'integer' })
  sourceChainMempoolEpoch!: number;

  @Column({ name: 'state_validator', type: 'text', nullable: true })
  stateValidator!: string | null;

  @Column({ name: 'state', type: 'smallint' })
  state!: number;

  @Column({ name: 'included_in_master_block', type: 'text', nullable: true })
  includedInMasterBlock!: string;

  @Column({ name: 'master_block_tx_index', type: 'integer' })
  masterBlockTransactionIndex!: number;

  // Events we care about for linking later
  @Column({ name: 'source_chain_push_event_id', type: 'uuid', nullable: true })
  sourceChainPushEventId!: string | null;

  @Column({ name: 'state_validation_event_id', type: 'uuid', nullable: true })
  stateValidationEventId!: string | null;

  @Column({ name: 'source_push_tx_hash', type: 'text', nullable: true })
  sourceChainPushTxHash!: string | null;

  @Column({ name: 'state_validation_tx_hash', type: 'text', nullable: true })
  stateValidationTxHash!: string | null;

  @Column({ name: 'state_validation_result', type: 'smallint', nullable: true })
  stateValidationResult!: number | null; // 0=pending,1=success,2=rollback

  @Column({ name: 'result', type: 'smallint', nullable: true })
  result!: number | null; // 0=pending, 1=success, 2=failed (from RN top-level)

  // TEMPORARY, until a relation implemented
  masterBlock?: MasterChainBlockEntity | null;

  @OneToMany(
    'ExecutionPartEntity',
    (part: ExecutionPartEntity) => part.transaction,
  ) executionParts!: Relation<ExecutionPartEntity>[];

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
