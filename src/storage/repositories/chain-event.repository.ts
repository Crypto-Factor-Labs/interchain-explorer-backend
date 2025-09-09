import type { ChainEventEntity } from '../entities/chain-event.entity.js';

export const CHAIN_EVENT_REPO = 'CHAIN_EVENT_REPO';

export interface UpsertChainEventInput {
  // Block-level (required)
  blockHash: string;
  blockHeight: string;       // keep as decimal string
  blockTimestamp: number;    // ms epoch
  blockSubchain?: string | null;

  // Transaction-level (optional)
  transactionHash?: string | null;
  transactionReceiver?: string | null;
  transactionSender?: string | null;
  transactionSubchain?: string | null;
  transactionData?: string | null;

  // Event-level (optional)
  eventHash?: string | null;
  eventTimestamp?: number | null;   // ms epoch
  eventBlock?: string | null;
  eventBlockHeight?: string | null; // decimal string
  eventReceiver?: string | null;
  eventSender?: string | null;
  eventSubchain?: string | null;
  eventData?: string | null;

  // Metadata
  type?: number | null;
  encodableType?: number | null;

  // Execution result (nullable; 0=pending, 1=success, 2=failed)
  result?: 0 | 1 | 2 | null;
}

export interface ChainEventRepository {
  /**
   * Upsert a ChainEvent. Duplicate guard is `eventHash` when provided.
   * - If eventHash is present and exists → update that row.
   * - If eventHash is null/absent → insert a new row.
   */
  upsert(input: UpsertChainEventInput): Promise<ChainEventEntity>;

  /**
   * Find latest event by its event hash (exact match).
   */
  findByEventHash(hash: string): Promise<ChainEventEntity | null>;
}
