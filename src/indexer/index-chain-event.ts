import type { EntityManager } from 'typeorm';
import { ChainEventEntity } from '../storage/entities/chain-event.entity.js';
import type { normalizeChainEvent } from '../reader-node/ingest-helpers.js';
import { normalizeEventHash, computeEventFingerprint, type FingerprintInput } from '../reader-node/event-fingerprint.js';
import type { ValidationResult, ExecResult } from '../reader-node/types/common.types.js';

/**
 * Insert a ChainEvent once, keyed by fingerprint.
 * - Always computes fingerprint (even if real hash exists).
 * - Uses INSERT ... ON CONFLICT (event_fingerprint) DO NOTHING.
 * - Returns the stored row id (uuid) or null if evt is undefined.
 *
 * Note: we still store eventHash (normalized) when present for display/deeplinks.
 */
export async function insertChainEvent(
  manager: EntityManager,
  evt: ReturnType<typeof normalizeChainEvent> | undefined,
  fpInput: FingerprintInput,
  result: ValidationResult | ExecResult | null = null,
): Promise<string | null> {
  if (!evt) return null;

  const repo = manager.getRepository(ChainEventEntity);

  const eventFingerprint = computeEventFingerprint(fpInput);
  const eventHash = normalizeEventHash(evt.eventHash);

  // Prepare insert row (only immutable fields!)
  const row: Partial<ChainEventEntity> = {
    // identity
    eventFingerprint,
    eventHash,

    // block-level
    blockHash: evt.blockHash ?? null,
    blockHeight: evt.blockHeight ?? null,
    blockTimestamp: evt.blockTimestamp ?? null,
    blockSubchain: evt.blockSubchain ?? null,

    // tx-level
    transactionHash: evt.transactionHash ?? null,
    transactionReceiver: evt.transactionReceiver ?? null,
    transactionSender: evt.transactionSender ?? null,
    transactionSubchain: evt.transactionSubchain ?? null,

    // event-level
    eventBlock: evt.eventBlock ?? null,
    eventBlockHeight: evt.eventBlockHeight ?? null,
    eventTimestamp: evt.eventTimestamp ?? null,
    eventReceiver: evt.eventReceiver ?? null,
    eventSender: evt.eventSender ?? null,
    eventSubchain: evt.eventSubchain ?? null,

    // meta
    type: evt.type ?? null,
    encodableType: evt.encodableType ?? null,

    // execution result snapshot (if applicable)
    result,
  };

  // Insert-once by fingerprint, ignoring on conflict
  await repo
    .createQueryBuilder()
    .insert()
    .into(ChainEventEntity)
    .values(row)
    .orIgnore()  // respects UNIQUE(event_fingerprint) and partial-unique on event_hash
    .execute();

  // Fetch id (by fingerprint)
  const existing = await repo.findOne({
    select: ['id'],
    where: { eventFingerprint },
  });

  return existing?.id ?? null;
}
