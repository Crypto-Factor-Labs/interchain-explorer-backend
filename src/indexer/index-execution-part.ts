import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import type { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { insertChainEvent } from './index-chain-event.js';
import { ExecResult } from 'src/reader-node/types/common.types.js';

export async function indexExecutionPart(
  manager: EntityManager,
  txEntity: TransactionEntity,
  txHash: string,
  dto: Transaction['executionParts'][number],
  isRevert: boolean,
  partIndex?: number,
): Promise<void> {
  const partRepo = manager.getRepository(ExecutionPartEntity);

  // Normalize EP events
  const schedEvt = normalizeChainEvent(dto.targetChainSchedulingEvent);
  const publishEvt = normalizeChainEvent(dto.targetChainPublishEvent);
  const execEvt = normalizeChainEvent(dto.targetChainExecutionEvent);
  const commitEvt = normalizeChainEvent(dto.mempoolEpochCommitEvent);

  const execRes: ExecResult | null = resultFromEvent(dto.targetChainExecutionEvent) ?? null;

  const idx = isRevert ? -1 : (Number.isInteger(partIndex) ? (partIndex as number) : 0);
  const cid = dto.chainId ?? 0;

  // Base part data (non-FK)
  const partData: Partial<ExecutionPartEntity> = {
    transaction: txEntity,
    hash: dto.hash,
    transactionHash: txHash,
    isRevert,
    partIndex: isRevert ? null : idx,
    chainId: dto.chainId ?? null,
    operatorAddress: dto.operatorAddress ?? null,
    senderAddress: dto.senderAddress ?? null,
    includedInPartialBlock: dto.includedInPartialBlock ?? null,
    partialBlockPartIndex:
      typeof dto.partialBlockPartIndex === 'number' ? dto.partialBlockPartIndex : null,
    mempoolEpochConsensusProof: dto.mempoolEpochConsensusProof ?? null,
    mempoolEpochEVMProof: dto.mempoolEpochEVMProof ?? null,
    targetExecutionResult: execRes,
  };

  // Find-or-create the EP row by natural key (txHash + isRevert/(partIndex))
  const existing = isRevert
    ? await partRepo.findOne({ where: { transactionHash: txHash, isRevert: true } })
    : await partRepo.findOne({ where: { transactionHash: txHash, isRevert: false, partIndex: idx } });

  const row = existing ?? (await partRepo.save(partRepo.create(partData)));

  // For each event-kind: if FK is missing --> insert-by-fingerprint --> set FK

  // target_sched_event_id
  if (!row.targetSchedulingEventId && schedEvt) {
    const id = await insertChainEvent(
      manager,
      schedEvt,
      { kind: 'ep.scheduling', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
      null,
    );
    if (id) {
      await partRepo.update({ id: row.id }, { targetSchedulingEventId: id });
      row.targetSchedulingEventId = id;
    }
  }

  // target_publish_event_id
  if (!row.targetPublishEventId && publishEvt) {
    const id = await insertChainEvent(
      manager,
      publishEvt,
      { kind: 'ep.publish', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
      null,
    );
    if (id) {
      await partRepo.update({ id: row.id }, { targetPublishEventId: id });
      row.targetPublishEventId = id;
    }
  }

  // target_exec_event_id
  if (!row.targetExecutionEventId && execEvt) {
    const id = await insertChainEvent(
      manager,
      execEvt,
      { kind: 'ep.execution', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
      execRes,
    );
    if (id) {
      await partRepo.update({ id: row.id }, { targetExecutionEventId: id, targetExecutionResult: execRes });
      row.targetExecutionEventId = id;
      row.targetExecutionResult = execRes;
    }
  }

  // mempool_commit_event_id
  if (!row.mempoolCommitEventId && commitEvt) {
    const id = await insertChainEvent(
      manager,
      commitEvt,
      { kind: 'ep.commit', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
      null,
    );
    if (id) {
      await partRepo.update({ id: row.id }, { mempoolCommitEventId: id });
      row.mempoolCommitEventId = id;
    }
  }

  // Persist any non-FK changes (idempotent)
  await partRepo.update({ id: row.id }, partData);
}
