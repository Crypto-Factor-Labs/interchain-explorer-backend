import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { normalizeChainEvent, txHashFromEvent, resultFromEvent, } from '../reader-node/ingest-helpers.js';

/* Index a single JSON-Transaction into the database using TypeORM
 * - Idempotent, i.e. calling repeatedly with the same payload won’t create duplicates
 * - Uses normalization helpers (ms timestamps, decimal heights)
 * - Runs inside the caller's transaction via the provided EntityManager
 */
export async function indexTransaction(tx: Transaction, manager: EntityManager,): Promise<void> {
  const txRepo = manager.getRepository(TransactionEntity);
  const partRepo = manager.getRepository(ExecutionPartEntity);

  // --- Normalize events (flat or nested; ms timestamps; decimal heights) ---
  const sourcePushEvt = normalizeChainEvent(tx.sourceChainPushEvent);
  const stateValidationEvt = normalizeChainEvent(tx.stateValidationEvent);

  // --- Upsert transaction (idempotent via unique index on transaction_hash) ---
  const txData: Partial<TransactionEntity> = {
    transactionHash: tx.transactionHash,
    sourceSender: tx.sourceSender,
    sourceChainId: tx.sourceChainId,
    sourceChainMempoolEpoch: tx.sourceChainMempoolEpoch,
    stateValidator: tx.stateValidator ?? null,
    state: tx.state,
    includedInMasterBlock: tx.includedInMasterBlock,
    masterBlockTransactionIndex: tx.masterBlockTransactionIndex,
    sourcePushTxHash: sourcePushEvt?.transactionHash ?? null,
    stateValidationTxHash: stateValidationEvt?.transactionHash ?? null,
    stateValidationResult: resultFromEvent(tx.stateValidationEvent) ?? null,
  };

  let txEntity = await txRepo.findOne({
    where: { transactionHash: tx.transactionHash },
  });

  if (!txEntity) {
    txEntity = txRepo.create(txData);
    await txRepo.insert(txEntity).catch(async (e: any) => {
      // Unique violation under concurrent workers → switch to update
      if (e?.code !== '23505') throw e;
      await txRepo.update({ transactionHash: tx.transactionHash }, txData);
    });
    // Ensure we have the persisted row (with id)
    txEntity =
      txEntity.id
        ? txEntity
        : await txRepo.findOneOrFail({ where: { transactionHash: tx.transactionHash } });
  } else {
    await txRepo.update({ id: txEntity.id }, txData);
  }

  // --- Build discriminated union for parts (avoids null in TypeORM where) ---
  type NonRevertPart = {
    dto: Transaction['executionParts'][number];
    isRevert: false;
    partIndex: number;
  };
  type RevertPart = {
    dto: Transaction['executionParts'][number];
    isRevert: true;
  };
  type PartInput = NonRevertPart | RevertPart;

  const parts: PartInput[] = [
    ...(tx.executionParts ?? []).map((p) => ({
      dto: p,
      isRevert: false as const,
      partIndex: p.transactionExecutionPartIndex,
    })),
    ...(tx.revertExecutionPart
      ? [{ dto: tx.revertExecutionPart, isRevert: true as const }]
      : []),
  ];

  for (const p of parts) {
    const execEvt = normalizeChainEvent(p.dto.targetChainExecutionEvent);
    const schedEvt = normalizeChainEvent(p.dto.targetChainSchedulingEvent);

    const partData: Partial<ExecutionPartEntity> = {
      transaction: txEntity,
      transactionHash: tx.transactionHash,
      isRevert: p.isRevert,
      partIndex: p.isRevert ? null : p.partIndex, // entity allows null; we never filter by null
      chainId: p.dto.chainId,
      operatorAddress: p.dto.operatorAddress,
      senderAddress: p.dto.senderAddress,
      includedInPartialBlock: p.dto.includedInPartialBlock ?? null,
      partialBlockPartIndex:
        typeof p.dto.partialBlockPartIndex === 'number' ? p.dto.partialBlockPartIndex : null,
      targetExecutionTxHash: txHashFromEvent(execEvt) ?? null,
      targetExecutionResult: resultFromEvent(p.dto.targetChainExecutionEvent) ?? null,
      targetSchedulingTxHash: txHashFromEvent(schedEvt) ?? null,
    };

    // Idempotent lookup (no nulls in WHERE)
    const existing = p.isRevert
      ? await partRepo.findOne({
        where: { transactionHash: tx.transactionHash, isRevert: true },
        select: ['id'],
      })
      : await partRepo.findOne({
        where: { transactionHash: tx.transactionHash, partIndex: p.partIndex, isRevert: false },
        select: ['id'],
      });

    if (!existing) {
      const row = partRepo.create(partData);
      await partRepo.insert(row).catch(async (e: any) => {
        if (e?.code !== '23505') throw e; // unique violation → update
        if (p.isRevert) {
          await partRepo.update(
            { transactionHash: tx.transactionHash, isRevert: true },
            partData,
          );
        } else {
          await partRepo.update(
            { transactionHash: tx.transactionHash, partIndex: p.partIndex, isRevert: false },
            partData,
          );
        }
      });
    } else {
      await partRepo.update({ id: existing.id }, partData);
    }
  }
}
