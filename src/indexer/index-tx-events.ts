import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent } from '../reader-node/ingest-helpers.js';
import { insertChainEvent } from './index-chain-event.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ValidationResult } from 'src/reader-node/types/common.types.js';

/**
 * Attach tx-level ChainEvents (push, state_validation) using fingerprinted inserts.
 * - Skips per-event if FK is already set.
 * - Returns when done; idempotent and safe under concurrency.
 */
export async function attachTxLevelEvents(
  manager: EntityManager,
  txEntity: TransactionEntity,
  txFull: Transaction,
): Promise<void> {
  const txRepo = manager.getRepository(TransactionEntity);
  const txHash = txEntity.transactionHash;

  // Normalize events
  const pushEvt = normalizeChainEvent(txFull.sourceChainPushEvent);
  const valEvt = normalizeChainEvent(txFull.stateValidationEvent);

  // source_chain_push_event_id
  if (!txEntity.sourceChainPushEventId && pushEvt) {
    const id = await insertChainEvent(
      manager,
      pushEvt,
      { kind: 'tx.push', transactionHash: txHash },
      null, // no result
    );
    if (id) {
      await txRepo.update({ id: txEntity.id }, { sourceChainPushEventId: id });
      txEntity.sourceChainPushEventId = id;
    }
  }

  // state_validation_event_id
  const validationResult = stateValidationResultFrom(txFull);
  const id = await insertChainEvent(
    manager,
    valEvt,
    { kind: 'tx.state_validation', transactionHash: txHash },
    validationResult,
  );
  if (id) {
    await txRepo.update({ id: txEntity.id }, { stateValidationEventId: id });
    txEntity.stateValidationEventId = id;
  }
}

// Extract execution result from tx.stateValidationEvent
function stateValidationResultFrom(txFull: Transaction): ValidationResult | null {
  const r = txFull.stateValidationEvent?.result;
  return r === 0 || r === 1 || r === 2 ? r as ValidationResult : null;
}
