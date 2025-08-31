import { Inject, Injectable } from '@nestjs/common';
import { ListTransactionsDto } from './dto/list-transactions.dto.js';
import { TX_REPO, TransactionRepository } from '../storage/repositories/transaction.repository.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TX_REPO)
    private readonly repo: TransactionRepository,
  ) { }

  async findOneByHash(hash: string) {
    const tx = await this.repo.findOneByHash(hash, true);
    return tx ? this.toDto(tx, true) : null;
  }

  /**
   * Lists transactions with pagination and optional filters.
   * @param qp - The query parameters for listing transactions.
   * @returns A promise resolving to an object containing total count and items.
   */
  async list(qp: ListTransactionsDto) {
    const { items, total } = await this.repo.list({
      take: qp.take,
      skip: qp.skip,
      includeParts: qp.includeParts,
      sender: qp.sender,
      operator: qp.operator,
    });

    return {
      total,
      items: items.map(tx => this.toDto(tx, qp.includeParts)),
    };
  }

  /**
   * Counts total transactions, optionally based on filters.
   * @param params - Filters for counting transactions.
   * @returns A promise resolving to the total count of transactions.
   */
  async countTotal(params: { sender?: string; operator?: string } = {}): Promise<number> {
    return this.repo.countTotal({
      sender: params.sender,
      operator: params.operator,
    });
  }

  /**
   * Converts a TransactionEntity to a DTO object, including execution parts if specified.
   * @param tx - The transaction entity to convert.
   * @param includeParts - Whether to include execution parts in the DTO.
   * @returns The DTO representation of the transaction.
   */
  private toDto(tx: TransactionEntity, includeParts: boolean) {
    const anyT = tx as any;
    const base: any = {
      id: anyT.id,
      transactionHash: anyT.transactionHash ?? anyT.transaction_hash,
      includedInMasterBlock: anyT.includedInMasterBlock ?? anyT.included_in_master_block ?? null,
      masterBlockHeight: anyT.masterBlock?.height ?? null,  // Use the hydrated masterBlock relation if present
      masterBlockTxIndex: anyT.masterBlockTransactionIndex ?? anyT.master_block_tx_index ?? null,
      sourceSender: anyT.sourceSender ?? anyT.source_sender ?? null,
      sourceChainId: anyT.sourceChainId ?? anyT.source_chain_id ?? null,
      state: anyT.state ?? null,
      result: anyT.result ?? null,
    };

    if (!includeParts) return base;

    // TEMPORARY: Helper to pick first defined property from object
    const pick = (o: any, ...ks: string[]) => ks.reduce<any>((v, k) => (v ?? o?.[k]), undefined);

    const parts = (anyT.executionParts ?? []) as any[];

    // Deduplicate parts by hash, preferring reverts over non-reverts, and lower partIndex over higher
    const byHash = new Map<string, any>();
    const score = (ep: any) => {
      const pi = pick(ep, 'partIndex', 'part_index');
      const revFlag = pick(ep, 'isRevert', 'is_revert');
      const isRevert = (pi == null) || revFlag === true || revFlag === 1;
      // Lower score wins: revert (0) beats non-revert (1); tie-break by partIndex
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

    base.executionParts = finalParts.map(ep => ({
      id: ep.id ?? null,
      hash: ep.hash ?? null,
      transactionHash: pick(ep, 'transactionHash', 'transaction_hash'),
      partIndex: pick(ep, 'partIndex', 'part_index'),
      isRevert: pick(ep, 'isRevert', 'is_revert') === true,
      chainId: pick(ep, 'chainId', 'chain_id') ?? null,
      includedInPartialBlock: pick(ep, 'includedInPartialBlock', 'included_in_partial_block') ?? null,
      partialBlockHeight: ep.partialBlock?.height ?? null,  // Use the hydrated partialBlock relation if present
      partialBlockPartIndex: pick(ep, 'partialBlockPartIndex', 'partial_block_part_index') ?? null,
      operatorAddress: pick(ep, 'operatorAddress', 'operator_address') ?? null,
      senderAddress: pick(ep, 'senderAddress', 'sender_address') ?? null,
    }));

    return base;
  }
}
