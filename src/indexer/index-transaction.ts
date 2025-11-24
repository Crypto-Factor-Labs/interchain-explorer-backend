import { EntityManager } from 'typeorm';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { indexExecutionPart } from './index-execution-part.js';
import { normalizeChainEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import { attachTxLevelEvents } from './index-tx-events.js';

export async function indexTransaction(
  tx: Transaction,
  manager: EntityManager,
): Promise<void> {
  const txRepo = manager.getRepository(TransactionEntity);

  // Used to derive the tri-state result for the tx row
  const stateValidationEvt = normalizeChainEvent(tx.stateValidationEvent);

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
    stateValidationResult: resultFromEvent(stateValidationEvt) ?? null,
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

  // --- Tx-level events (source push + state validation) ---
  await attachTxLevelEvents(manager, txEntity, tx);

  // --- Index ExecutionParts (non-revert + optional revert) ---
  const parts = [
    ...(tx.executionParts ?? []).map(p => ({
      dto: p,
      isRevert: false as const,
      partIndex: p.transactionExecutionPartIndex,
    })),
    ...(tx.revertExecutionPart ? [{ dto: tx.revertExecutionPart, isRevert: true as const }] : []),
  ];

  for (const part of parts) {
    await indexExecutionPart(
      manager,
      txEntity,
      tx.transactionHash,
      part.dto,
      part.isRevert,
      part.isRevert ? undefined : part.partIndex,
    );
  }
}
