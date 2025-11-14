import type { ExecResult, ValidationResult } from '../../reader-node/types/common.types.js';
import { ChainEventEntity } from '../entities/chain-event.entity.js';

export type ChainEventResult = ExecResult | ValidationResult | null;

export const CHAIN_EVENT_REPO = 'CHAIN_EVENT_REPO';

/** Minimal normalized event payload (no IDs, no fingerprint) */
export interface ChainEventPayload {
  // block-level
  blockHash: string;
  blockHeight: string;
  blockTimestamp: number;
  blockSubchain: string | null;

  // tx-level
  transactionHash: string | null;
  transactionReceiver: string | null;
  transactionSender: string | null;
  transactionSubchain: string | null;

  // event-level
  eventHash: string | null;  // may be empty/zero
  eventTimestamp: number | null;
  eventBlock: string | null;
  eventBlockHeight: string | null;
  eventReceiver: string | null;
  eventSender: string | null;
  eventSubchain: string | null;

  // meta
  type: number | null;
  encodableType: number | null;

  // snapshot result (exec or validation context)
  result: ChainEventResult;
}

/** Insert contract: fingerprint + payload */
export interface InsertByFingerprintInput {
  fingerprint: string;
  payload: ChainEventPayload;
}

export interface ChainEventRepository {
  insertIfMissingByFingerprint(input: InsertByFingerprintInput): Promise<ChainEventEntity>;
  findById(id: string): Promise<ChainEventEntity | null>;
  findByFingerprint(fp: string): Promise<ChainEventEntity | null>;
  findByIds(ids: string[]): Promise<ChainEventEntity[]>;
}