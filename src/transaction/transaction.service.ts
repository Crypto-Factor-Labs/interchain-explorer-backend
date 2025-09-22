import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ListTransactionsDto } from './dto/list-transactions.dto.js';
import { TX_REPO, TransactionRepository } from '../storage/repositories/transaction.repository.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { collectEventHashesFromEPs, loadChainEventsMap } from '../services/chain-events.loader.js';
import { buildChainEventsForEP } from '../services/chain-events.mapper.js';
import type { ChainEvents } from '../types/chain-events.types.js';

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TX_REPO) private readonly repo: TransactionRepository,
    private readonly ds: DataSource, // for batch loading ChainEvents
  ) { }

  async findOneByHash(hash: string) {
    // Always include parts for detail
    const tx = await this.repo.findOneByHash(hash, true);
    if (!tx) return null;

    // Build events for this one transaction (if it has parts)
    const eps = (tx as any).executionParts ?? [];
    const hashes = collectEventHashesFromEPs(eps as any);
    const ceMap = await loadChainEventsMap(this.ds.manager, hashes);

    return this.toDto(tx, true, ceMap);
  }

  async list(qp: ListTransactionsDto) {
    const { items, total } = await this.repo.list({
      take: qp.take,
      skip: qp.skip,
      includeParts: qp.includeParts,
      masterBlockHash: qp.masterBlockHash,
      sender: qp.sender,
      operator: qp.operator,
    });

    let ceMap: Map<string, any> | undefined;
    if (qp.includeParts && qp.includeEvents) {
      // Gather all EPs in this page and batch-load the related ChainEvents
      const allEPs = items.flatMap(t => ((t as any).executionParts ?? []));
      const hashes = collectEventHashesFromEPs(allEPs as any);
      ceMap = await loadChainEventsMap(this.ds.manager, hashes);
    }

    return {
      total,
      items: items.map(tx => this.toDto(tx, qp.includeParts, ceMap)),
    };
  }

  async countTotal(params: { masterBlockHash?: string, sender?: string; operator?: string } = {}): Promise<number> {
    return this.repo.countSelectedTotal({
      masterBlockHash: params.masterBlockHash,
      sender: params.sender,
      operator: params.operator
    });
  }

  /**
   * Convert a TransactionEntity → DTO.
   * When ceMap is provided, attach 4-step ChainEvents to each EP.
   */
  private toDto(tx: TransactionEntity, includeParts: boolean, ceMap?: Map<string, any>) {
    const anyT = tx as any;
    const base: any = {
      id: anyT.id,
      transactionHash: anyT.transactionHash ?? anyT.transaction_hash,
      includedInMasterBlock: anyT.includedInMasterBlock ?? anyT.included_in_master_block ?? null,
      masterBlockHeight: anyT.masterBlock?.height ?? null,
      masterBlockTxIndex: anyT.masterBlockTransactionIndex ?? anyT.master_block_tx_index ?? null,
      sourceSender: anyT.sourceSender ?? anyT.source_sender ?? null,
      sourceChainId: anyT.sourceChainId ?? anyT.source_chain_id ?? null,
      state: anyT.state ?? null,
      result: anyT.result ?? null,
      stateValidationResult: anyT.stateValidationResult ?? anyT.state_validation_result ?? null,
    };

    if (!includeParts) return base;

    const pick = (o: any, ...ks: string[]) => ks.reduce<any>((v, k) => (v ?? o?.[k]), undefined);
    const parts = (anyT.executionParts ?? []) as any[];

    // Deduplicate parts by hash (prefer revert; then lower partIndex)
    const byHash = new Map<string, any>();
    const score = (ep: any) => {
      const pi = pick(ep, 'partIndex', 'part_index');
      const revFlag = pick(ep, 'isRevert', 'is_revert');
      const isRevert = (pi == null) || revFlag === true || revFlag === 1;
      return [isRevert ? 0 : 1, pi ?? Number.POSITIVE_INFINITY] as [number, number];
    };
    for (const ep of parts) {
      const k = ep.hash as string;
      if (!k) continue;
      const cur = byHash.get(k);
      if (!cur) byHash.set(k, ep);
      else {
        const [sa, ia] = score(ep);
        const [sb, ib] = score(cur);
        if (sa < sb || (sa === sb && ia < ib)) byHash.set(k, ep);
      }
    }
    const finalParts = Array.from(byHash.values());

    // Compute 4-step events per EP when ceMap is provided
    let eventsById: Map<string, ChainEvents> | undefined;
    if (ceMap) {
      eventsById = new Map<string, ChainEvents>();
      for (const ep of finalParts) {
        const events = buildChainEventsForEP(ep, ceMap, base.state ?? (anyT.state as any)) as ChainEvents;
        if (ep.id) eventsById.set(ep.id, events);
      }
    }

    base.executionParts = finalParts.map(ep => ({
      id: ep.id ?? null,
      hash: ep.hash ?? null,
      transactionHash: pick(ep, 'transactionHash', 'transaction_hash'),
      partIndex: pick(ep, 'partIndex', 'part_index'),
      isRevert: pick(ep, 'isRevert', 'is_revert') === true,
      chainId: pick(ep, 'chainId', 'chain_id') ?? null,
      includedInPartialBlock: pick(ep, 'includedInPartialBlock', 'included_in_partial_block') ?? null,
      partialBlockHeight: ep.partialBlock?.height ?? null,
      partialBlockPartIndex: pick(ep, 'partialBlockPartIndex', 'partial_block_part_index') ?? null,
      operatorAddress: pick(ep, 'operatorAddress', 'operator_address') ?? null,
      senderAddress: pick(ep, 'senderAddress', 'sender_address') ?? null,

      // 4-step progress (only present when includeEvents=true)
      ...(eventsById ? { events: eventsById.get(ep.id) } : {}),
    }));

    return base;
  }
}
