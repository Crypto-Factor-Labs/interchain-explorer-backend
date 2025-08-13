import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ListTransactionsDto } from './dto/list-transactions.dto.js';
import { TransactionEntity } from '../storage/entities/transaction.entity.js';
import { ExecutionPartEntity } from '../storage/entities/execution-part.entity.js';

@Injectable()
export class TransactionService {
  constructor(private readonly ds: DataSource) { }

  async findOneByHash(hash: string) {
    const repo = this.ds.getRepository(TransactionEntity);
    const tx = await repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.executionParts', 'p')
      .where('t.transaction_hash = :hash', { hash })
      .orderBy('p.part_index', 'ASC', 'NULLS LAST')
      .getOne();

    return tx ? this.toDto(tx, true) : null;
  }

  async list(q: ListTransactionsDto) {
    const repo = this.ds.getRepository(TransactionEntity);

    // 1) page of IDs (correct pagination)
    const idQb = repo.createQueryBuilder('t').select('t.id', 'id');

    if (q.sender) idQb.andWhere('t.source_sender = :sender', { sender: q.sender });
    if (q.operator) {
      idQb.innerJoin(
        ExecutionPartEntity,
        'p',
        'p.transaction_id = t.id AND p.operator_address = :op',
        { op: q.operator },
      );
    }

    idQb.orderBy('t.id', 'DESC').offset(q.skip).limit(q.take);

    const rows = await idQb.getRawMany<{ id: string }>();
    if (rows.length === 0) return { total: 0, items: [] };

    const ids = rows.map(r => r.id);

    // 2) fetch the rows (optionally with parts)
    const qb = repo.createQueryBuilder('t').whereInIds(ids).orderBy('t.id', 'DESC');
    if (q.include_parts) qb.leftJoinAndSelect('t.executionParts', 'p').addOrderBy('p.part_index', 'ASC', 'NULLS LAST');

    const txs = await qb.getMany();
    const total = await this.countTotal(q);

    return { total, items: txs.map(t => this.toDto(t, q.include_parts)) };
  }

  private async countTotal(q: ListTransactionsDto): Promise<number> {
    const repo = this.ds.getRepository(TransactionEntity);
    const qb = repo.createQueryBuilder('t').select('COUNT(DISTINCT t.id)', 'cnt');

    if (q.sender) qb.andWhere('t.source_sender = :sender', { sender: q.sender });
    if (q.operator) {
      qb.innerJoin(
        ExecutionPartEntity,
        'p',
        'p.transaction_id = t.id AND p.operator_address = :op',
        { op: q.operator },
      );
    }

    const r = await qb.getRawOne<{ cnt: string }>();
    return Number(r?.cnt ?? 0);
  }

  private toDto(t: TransactionEntity, includeParts: boolean) {
    const anyT = t as any;
    const base: any = {
      id: anyT.id,
      transactionHash: anyT.transactionHash ?? anyT.transaction_hash,
      includedInMasterBlock: anyT.includedInMasterBlock ?? anyT.included_in_master_block ?? null,
      masterBlockTransactionIndex: anyT.masterBlockTransactionIndex ?? anyT.master_block_tx_index ?? null,
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
