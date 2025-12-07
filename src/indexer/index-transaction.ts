import { EntityManager } from 'typeorm';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { indexExecutionPart } from './index-execution-part.js';
import { ensureTxLevelEvents } from './tx-event-helpers.js';
import { BN } from '@partisiablockchain/abi-client';

export async function indexTransaction(
  tx: Transaction,
  manager: EntityManager,
): Promise<void> {
  const txRepo = manager.getRepository(TransactionEntity);

  // --- Upsert Transaction (unique on transaction_hash) ---
  const txData: Partial<TransactionEntity> = {
    transactionHash: tx.transactionHash,
    sourceSender: tx.sourceSender,
    sourceChainId: tx.sourceChainId,
    sourceChainMempoolEpoch: tx.sourceChainMempoolEpoch,
    stateValidator: tx.stateValidator ?? null,
    state: tx.state,
    includedInMasterBlock: tx.includedInMasterBlock,
    masterBlockTransactionIndex: tx.masterBlockTransactionIndex,
    ...(tx.feePerUnit != null ? { feePerUnit: new BN(String(tx.feePerUnit), 10) } : {}),
  };

  let txEntity = await txRepo.findOne({ where: { transactionHash: tx.transactionHash } });
  if (!txEntity) {
    txEntity = txRepo.create(txData);
    await txRepo.insert(txEntity).catch(async (e: any) => {
      if (e?.code !== '23505') throw e; // unique violation → update
      await txRepo.update({ transactionHash: tx.transactionHash }, txData);
    });
    txEntity = txEntity.id
      ? txEntity
      : await txRepo.findOneOrFail({ where: { transactionHash: tx.transactionHash } });
  } else {
    await txRepo.update({ id: txEntity.id }, txData);
  }

  // Ensure tx-level events exist and get their ids/hashes/results
  {
    const { pushId, svId, pushHash, svHash, svRes } =
      await ensureTxLevelEvents(manager, tx.transactionHash, tx);

    await txRepo.update({ id: txEntity.id }, {
      sourceChainPushEventId: pushId,
      stateValidationEventId: svId,
      sourceChainPushTxHash: pushHash,
      stateValidationTxHash: svHash,
      stateValidationResult: svRes,
    });

    // Keep entity object in sync if you reuse it below
    txEntity.sourceChainPushEventId = pushId ?? null;
    txEntity.stateValidationEventId = svId ?? null;

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
}