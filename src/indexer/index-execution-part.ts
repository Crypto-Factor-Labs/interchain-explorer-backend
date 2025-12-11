import type { EntityManager } from 'typeorm';
import type { Transaction } from '../reader-node/types/transaction.types.js';
import { normalizeChainEvent, resultFromEvent } from '../reader-node/ingest-helpers.js';
import { ExecResult } from '../reader-node/types/common.types.js';
import type { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { ChainEventEntity } from '../storage/entities/chain-event.entity.js';
import { insertChainEvent } from './index-chain-event.js';

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
  const commitEvt = normalizeChainEvent(dto.mempoolEpochCommitEvent);
  const publishEvt = normalizeChainEvent(dto.targetChainPublishEvent);
  const schedEvt = normalizeChainEvent(dto.targetChainSchedulingEvent);
  const execEvt = normalizeChainEvent(dto.targetChainExecutionEvent);

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
    executionSignature: dto.executionSignature ?? null,
    targetExecutionResult: execRes,
  };

  // Find-or-create the EP row by natural key (txHash + isRevert/(partIndex))
  const existing = isRevert
    ? await partRepo.findOne({ where: { transactionHash: txHash, isRevert: true } })
    : await partRepo.findOne({ where: { transactionHash: txHash, isRevert: false, partIndex: idx } });

  const row = existing ?? (await partRepo.save(partRepo.create(partData)));

  // For each event-kind: if FK is missing --> insert-by-fingerprint --> set FK

  // mempool_commit_event_id
  if (!row.mempoolCommitEventId) {
    let commitId: string | null = null;

    // Prefer EP-level commit event if present
    if (commitEvt) {
      commitId = await insertChainEvent(
        manager,
        commitEvt,
        { kind: 'ep.commit', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
        null,
      );
    }

    // Fallback: PB-level commit event (by block_hash + kind)
    if (!commitId && partData.includedInPartialBlock) {
      commitId = await findPbEventIdByKind(manager, partData.includedInPartialBlock, 'pb.commit');
    }

    if (commitId) {
      await partRepo.update({ id: row.id }, { mempoolCommitEventId: commitId });
      (row as any).mempoolCommitEventId = commitId;
    }
  }

  // target_publish_event_id
  if (!row.targetPublishEventId) {
    let publishId: string | null = null;

    // Prefer EP-level publish event if present
    if (publishEvt) {
      publishId = await insertChainEvent(
        manager,
        publishEvt,
        { kind: 'ep.publish', transactionHash: txHash, partIndex: idx, isRevert, chainId: cid },
        null,
      );
    }

    // Fallback: PB-level publish event for this partial block (by block_hash + kind)
    if (!publishId && partData.includedInPartialBlock) {
      publishId = await findPbEventIdByKind(manager, partData.includedInPartialBlock, 'pb.publish');
    }

    if (publishId) {
      await partRepo.update({ id: row.id }, { targetPublishEventId: publishId });
      (row as any).targetPublishEventId = publishId;
    }
  }

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

  // Persist any non-FK changes (idempotent)
  await partRepo.update({ id: row.id }, partData);
}

// Helper to find PB-level ChainEvent using the fingerprint
// replace your current findPbEventIdByKind with this
export async function findPbEventIdByKind(
  manager: EntityManager,
  partialBlockHash: string,
  kind: 'pb.publish' | 'pb.commit',
): Promise<string | null> {
  if (!partialBlockHash) return null;

  // Fingerprints we create: `${kind}|${partialBlockHash}|...`
  const row = await manager.getRepository(ChainEventEntity)
    .createQueryBuilder('ce')
    .select(['ce.id'])
    .where('ce.eventFingerprint LIKE :prefix', { prefix: `${kind}|${partialBlockHash}|%` })
    .orderBy('ce.eventTimestamp', 'DESC', 'NULLS LAST')
    .addOrderBy('ce.blockTimestamp', 'DESC')
    .getOne();

  return row?.id ?? null;
}

