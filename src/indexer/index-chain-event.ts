import type { EntityManager } from 'typeorm';
import { ChainEventEntity } from '../storage/entities/chain-event.entity.js';
import type { normalizeChainEvent } from '../reader-node/ingest-helpers.js';

/**
 * Idempotently upsert a single ChainEvent by event_hash.
 * Returns the eventHash (or null if event is missing or has no hash).
 */
export async function upsertChainEvent(
  manager: EntityManager,
  evt: ReturnType<typeof normalizeChainEvent> | undefined,
  result: 0 | 1 | 2 | null = null,
): Promise<string | null> {
  if (!evt?.eventHash) return null;

  const repo = manager.getRepository(ChainEventEntity);
  const row: Partial<ChainEventEntity> = {
    // Event-level
    eventHash: evt.eventHash,
    eventTimestamp: evt.eventTimestamp ?? null,
    eventBlock: evt.eventBlock ?? null,
    eventBlockHeight: evt.eventBlockHeight ?? null,
    eventReceiver: evt.eventReceiver ?? null,
    eventSender: evt.eventSender ?? null,
    eventSubchain: evt.eventSubchain ?? null,
    eventData: evt.eventData ?? null,

    // Tx-level
    transactionHash: evt.transactionHash ?? null,
    transactionReceiver: evt.transactionReceiver ?? null,
    transactionSender: evt.transactionSender ?? null,
    transactionSubchain: evt.transactionSubchain ?? null,
    transactionData: evt.transactionData ?? null,

    // Block-level
    blockHash: evt.blockHash,
    blockHeight: evt.blockHeight,
    blockTimestamp: evt.blockTimestamp,
    blockSubchain: evt.blockSubchain ?? null,

    // meta
    type: evt.type ?? null,
    encodableType: evt.encodableType ?? null,

    // execution result (nullable)
    result,
  };

  await repo.upsert(row, {
    conflictPaths: ['eventHash'],
    skipUpdateIfNoValuesChanged: true,
  });

  return evt.eventHash;
}
