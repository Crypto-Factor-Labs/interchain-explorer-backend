import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent, resultFromEvent, } from '../reader-node/ingest-helpers.js';
import type { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { upsertChainEvent } from './index-chain-event.js';

/**
 * Persist ONE ExecutionPart and set its 4 event-hash refs.
 * Idempotent on (transactionHash, partIndex, isRevert), so it behaves like an upsert.
 */
export async function indexExecutionPart(
  manager: EntityManager,
  txEntity: TransactionEntity,
  txHash: string,
  dto: Transaction['executionParts'][number],
  isRevert: boolean,
  partIndex?: number,
): Promise<void> {
  const partRepo = manager.getRepository(ExecutionPartEntity);

  // Normalize EP-level events
  const schedEvt = normalizeChainEvent(dto.targetChainSchedulingEvent);
  const publishEvt = normalizeChainEvent(dto.targetChainPublishEvent);
  const execEvt = normalizeChainEvent(dto.targetChainExecutionEvent);
  const commitEvt = normalizeChainEvent(dto.mempoolEpochCommitEvent);

  // Persist ChainEvents first so references are valid
  const execRes = resultFromEvent(dto.targetChainExecutionEvent) ?? null;
  const schedHash = await upsertChainEvent(manager, schedEvt, null);
  const publishHash = await upsertChainEvent(manager, publishEvt, null);
  const execHash = await upsertChainEvent(manager, execEvt, execRes);
  const commitHash = await upsertChainEvent(manager, commitEvt, null);

  const partData: Partial<ExecutionPartEntity> = {
    transaction: txEntity,
    hash: dto.hash,
    transactionHash: txHash,
    isRevert,
    partIndex: isRevert ? null : (partIndex ?? null),
    chainId: dto.chainId,
    operatorAddress: dto.operatorAddress,
    senderAddress: dto.senderAddress,
    includedInPartialBlock: dto.includedInPartialBlock ?? null,
    partialBlockPartIndex:
      typeof dto.partialBlockPartIndex === 'number' ? dto.partialBlockPartIndex : null,

    // Event-hash references
    targetSchedulingEventHash: schedHash,
    targetPublishEventHash: publishHash,
    targetExecutionEventHash: execHash,
    mempoolCommitEventHash: commitHash,
    mempoolEpochConsensusProof: dto.mempoolEpochConsensusProof ?? null,
    mempoolEpochEVMProof: dto.mempoolEpochEVMProof ?? null,

    // Quick-access result on the EP row
    targetExecutionResult: execRes,
  };

  // Idempotent lookup key
  const existing = isRevert
    ? await partRepo.findOne({
      where: { transactionHash: txHash, isRevert: true },
      select: ['id'],
    })
    : await partRepo.findOne({
      where: { transactionHash: txHash, partIndex: partIndex!, isRevert: false },
      select: ['id'],
    });

  if (!existing) {
    const row = partRepo.create(partData);
    await partRepo.insert(row).catch(async (e: any) => {
      if (e?.code !== '23505') throw e; // unique violation → update
      if (isRevert) {
        await partRepo.update({ transactionHash: txHash, isRevert: true }, partData);
      } else {
        await partRepo.update({ transactionHash: txHash, partIndex: partIndex!, isRevert: false }, partData);
      }
    });
  } else {
    await partRepo.update({ id: existing.id }, partData);
  }
}
