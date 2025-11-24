import { In, EntityManager } from 'typeorm';
import type { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';
import { ChainEventEntity } from '../storage/entities/chain-event.entity.js';

// Collect all unique, non-null event IDs from a list of EPs
export function collectEventIdsFromEPs(eps: ExecutionPartEntity[]): string[] {
  const set = new Set<string>();

  for (const ep of eps) {
    if (ep.mempoolCommitEventId) set.add(ep.mempoolCommitEventId);
    if (ep.targetPublishEventId) set.add(ep.targetPublishEventId);
    if (ep.targetSchedulingEventId) set.add(ep.targetSchedulingEventId);
    if (ep.targetExecutionEventId) set.add(ep.targetExecutionEventId);
  }

  return [...set];
}

// Load a map of event id → ChainEventEntity for the given ids
export async function loadChainEventsMap(
  manager: EntityManager,
  ids: string[],
): Promise<Map<string, ChainEventEntity>> {
  if (!ids.length) return new Map();

  const repo = manager.getRepository(ChainEventEntity);
  const rows = await repo.find({ where: { id: In(ids) } });
  const map = new Map<string, ChainEventEntity>();

  for (const row of rows)
    if (row.id) map.set(row.id, row);

  return map;
}
