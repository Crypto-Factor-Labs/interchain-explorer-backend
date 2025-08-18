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
   * @param q - The query parameters for listing transactions.
   * @returns A promise resolving to an object containing total count and items.
   */
  async list(q: ListTransactionsDto) {
    const { items, total } = await this.repo.list({
      take: q.take,
      skip: q.skip,
      sender: q.sender,
      operator: q.operator,
      include_parts: q.include_parts,
    });

    return {
      total,
      items: items.map(t => this.toDto(t, q.include_parts)),
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
   * Converts a TransactionEntity to a DTO object.
   */
  private toDto(tx: TransactionEntity, includeParts: boolean) {
    const anyT = tx as any;
    const base: any = {
      id: anyT.id,
      transactionHash: anyT.transactionHash ?? anyT.transaction_hash,
      includedInMasterBlock: anyT.includedInMasterBlock ?? anyT.included_in_master_block ?? null,
      masterBlockTransactionIndex:
        anyT.masterBlockTransactionIndex ?? anyT.master_block_tx_index ?? null,
      sourceSender: anyT.sourceSender ?? anyT.source_sender ?? null,
      sourceChainId: anyT.sourceChainId ?? anyT.source_chain_id ?? null,
      state: anyT.state ?? null,
      result: anyT.result ?? null,
    };
    if (!includeParts) return base;

    const pick = (o: any, ...ks: string[]) => ks.reduce<any>((v, k) => (v ?? o?.[k]), undefined);

    const parts = (anyT.executionParts ?? []) as any[];
    base.executionParts = parts.map(p => ({
      transactionHash: pick(p, 'transactionHash', 'transaction_hash'),
      partIndex: pick(p, 'partIndex', 'part_index'),
      isRevert: pick(p, 'isRevert', 'is_revert') === true,
      chainId: pick(p, 'chainId', 'chain_id') ?? null,
      operatorAddress: pick(p, 'operatorAddress', 'operator_address') ?? null,
      senderAddress: pick(p, 'senderAddress', 'sender_address') ?? null,
      includedInPartialBlock: pick(p, 'includedInPartialBlock', 'included_in_partial_block') ?? null,
    }));

    return base;
  }
}
