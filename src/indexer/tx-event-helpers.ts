import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent, txHashFromEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import type { ExecResult, ValidationResult } from '../reader-node/types/common.types.js';
import { insertChainEvent } from './index-chain-event.js';

export interface TxEventOutcome {
  pushId: string | null;
  svId: string | null;
  pushHash: string | null;
  svHash: string | null;
  svRes: ExecResult | ValidationResult | null;
}

/**
 * Ensures tx-level events (push + state validation) exist and returns their ids/hashes/result.
 * Idempotent: if events already exist, their ids are re-used.
 */
export async function ensureTxLevelEvents(
  manager: EntityManager,
  txHash: string,
  tx: Pick<Transaction, 'sourceChainPushEvent' | 'stateValidationEvent'>,
): Promise<TxEventOutcome> {
  const pushEvt = normalizeChainEvent(tx.sourceChainPushEvent);
  const svEvt = normalizeChainEvent(tx.stateValidationEvent);

  const pushHash = txHashFromEvent(pushEvt);
  const svHash = txHashFromEvent(svEvt);
  const svRes = resultFromEvent(svEvt) ?? null;

  // Fingerprints use only the transaction hash for tx-level kinds
  const pushId = pushEvt
    ? await insertChainEvent(manager, pushEvt, { kind: 'tx.push', transactionHash: txHash }, null)
    : null;

  const svId = svEvt
    ? await insertChainEvent(manager, svEvt, { kind: 'tx.state_validation', transactionHash: txHash }, svRes)
    : null;

  return { pushId, svId, pushHash: pushHash ?? null, svHash: svHash ?? null, svRes };
}
