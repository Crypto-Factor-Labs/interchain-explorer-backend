import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent, txHashFromEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { upsertChainEvent } from './index-chain-event.js';
import { indexExecutionPart } from './index-execution-part.js';

/* Orchestrate indexing of a single JSON-Transaction.
 * - Idempotent writes for Transaction, ExecutionParts, and ChainEvents
 * - All operations use the provided EntityManager (single DB tx)
 */
export async function indexTransaction(
  tx: Transaction,
  manager: EntityManager,
): Promise<void> {
  const txRepo = manager.getRepository(TransactionEntity);

  // --- Normalize & persist top-level ChainEvents (optional, but useful) ---
  const sourcePushEvt = normalizeChainEvent(tx.sourceChainPushEvent);
  const stateValidationEvt = normalizeChainEvent(tx.stateValidationEvent);

  await upsertChainEvent(manager, sourcePushEvt, null);
  await upsertChainEvent(manager, stateValidationEvt, resultFromEvent(tx.stateValidationEvent) ?? null);

  // --- Upsert Transaction (idempotent via unique on transaction_hash) ---
  const txData: Partial<TransactionEntity> = {
    transactionHash: tx.transactionHash,
    sourceSender: tx.sourceSender,
    sourceChainId: tx.sourceChainId,
    sourceChainMempoolEpoch: tx.sourceChainMempoolEpoch,
    stateValidator: tx.stateValidator ?? null,
    state: tx.state,
    includedInMasterBlock: tx.includedInMasterBlock,
    masterBlockTransactionIndex: tx.masterBlockTransactionIndex,

    // Tx-level link fields
    sourcePushTxHash: txHashFromEvent(sourcePushEvt) ?? null,
    stateValidationTxHash: txHashFromEvent(stateValidationEvt) ?? null,
    stateValidationResult: resultFromEvent(tx.stateValidationEvent) ?? null,
  };

  let txEntity = await txRepo.findOne({ where: { transactionHash: tx.transactionHash } });
  if (!txEntity) {
    txEntity = txRepo.create(txData);
    await txRepo.insert(txEntity).catch(async (e: any) => {
      if (e?.code !== '23505') throw e;
      await txRepo.update({ transactionHash: tx.transactionHash }, txData);
    });
    txEntity = txEntity.id
      ? txEntity
      : await txRepo.findOneOrFail({ where: { transactionHash: tx.transactionHash } });
  } else {
    await txRepo.update({ id: txEntity.id }, txData);
  }

  // --- Index ExecutionParts (non-revert + optional revert) ---
  const parts = [
    ...(tx.executionParts ?? []).map(p => ({ dto: p, isRevert: false as const, partIndex: p.transactionExecutionPartIndex })),
    ...(tx.revertExecutionPart ? [{ dto: tx.revertExecutionPart, isRevert: true as const }] : []),
  ];

  for (const p of parts) {
    await indexExecutionPart(
      manager,
      txEntity,
      tx.transactionHash,
      p.dto,
      p.isRevert,
      p.isRevert ? undefined : p.partIndex,
    );
  }
}
