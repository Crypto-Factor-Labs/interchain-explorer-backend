import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import type { ExecResult } from '../../reader-node/types/common.types.js';

// ms epoch (number) <-> timestamptz transformer
const msEpoch: import('typeorm').ValueTransformer = {
  to: (ms?: number | null) => (ms ?? null) === null ? null : new Date(ms!),
  from: (v?: Date | null) => (v ? v.getTime() : null),
};

@Entity({ name: 'chain_events' })
export class ChainEventEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  // ---------- Block-level ----------
  @Index('ix_chain_events_block_hash')
  @Column({ name: 'block_hash', type: 'text' })
  blockHash!: string;

  @Index('ix_chain_events_block_height')
  @Column({ name: 'block_height', type: 'numeric', precision: 78, scale: 0 })
  blockHeight!: string; // keep as string in TS

  @Column({ name: 'block_timestamp', type: 'timestamptz', transformer: msEpoch })
  blockTimestamp!: number; // ms

  @Column({ name: 'block_subchain', type: 'text', nullable: true })
  blockSubchain?: string | null;

  // ---------- Transaction-level (optional) ----------
  @Index('ix_chain_events_tx_hash')
  @Column({ name: 'transaction_hash', type: 'text', nullable: true })
  transactionHash?: string | null;

  @Column({ name: 'transaction_receiver', type: 'text', nullable: true })
  transactionReceiver?: string | null;

  @Column({ name: 'transaction_sender', type: 'text', nullable: true })
  transactionSender?: string | null;

  @Column({ name: 'transaction_subchain', type: 'text', nullable: true })
  transactionSubchain?: string | null;

  // ---------- Event-level ----------
  @Index('ix_chain_events_event_hash')
  @Column({ name: 'event_hash', type: 'text', nullable: true })
  eventHash?: string | null;

  // eventHash can be null, therefore we need a separate unique fingerprint
  @Index('ux_chain_events_event_fingerprint')
  @Column({ name: 'event_fingerprint', type: 'text', nullable: true })
  eventFingerprint!: string | null;

  @Column({ name: 'event_timestamp', type: 'timestamptz', nullable: true, transformer: msEpoch })
  eventTimestamp?: number | null; // ms

  @Column({ name: 'event_block', type: 'text', nullable: true })
  eventBlock?: string | null;

  @Index('ix_chain_events_event_block_height')
  @Column({ name: 'event_block_height', type: 'numeric', precision: 78, scale: 0, nullable: true })
  eventBlockHeight?: string | null;

  @Column({ name: 'event_receiver', type: 'text', nullable: true })
  eventReceiver?: string | null;

  @Column({ name: 'event_sender', type: 'text', nullable: true })
  eventSender?: string | null;

  @Column({ name: 'event_subchain', type: 'text', nullable: true })
  eventSubchain?: string | null;

  // ---------- Optional metadata ----------
  @Column({ name: 'type', type: 'integer', nullable: true })
  type?: number | null;

  @Column({ name: 'encodable_type', type: 'integer', nullable: true })
  encodableType?: number | null;

  // ---------- Execution result (nullable) ----------
  // null => plain ChainEvent; 0/1/2 => ChainEventWithResult

  @Index('ix_chain_events_result')
  @Column({ name: 'result', type: 'smallint', nullable: true })
  result?: ExecResult | null;
}
