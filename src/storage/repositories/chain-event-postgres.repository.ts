import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { ChainEventRepository, UpsertChainEventInput } from './chain-event.repository.js';
import { ChainEventEntity } from '../entities/chain-event.entity.js';

@Injectable()
export class ChainEventPostgresRepository implements ChainEventRepository {
  private readonly repo: Repository<ChainEventEntity>;
  constructor(ds: DataSource) {
    this.repo = ds.getRepository(ChainEventEntity);
  }

  async upsert(input: UpsertChainEventInput): Promise<ChainEventEntity> {
    const entity = this.repo.create({
      blockHash: input.blockHash,
      blockHeight: input.blockHeight,
      blockTimestamp: input.blockTimestamp,
      blockSubchain: input.blockSubchain ?? null,

      transactionHash: input.transactionHash ?? null,
      transactionReceiver: input.transactionReceiver ?? null,
      transactionSender: input.transactionSender ?? null,
      transactionSubchain: input.transactionSubchain ?? null,
      transactionData: input.transactionData ?? null,

      eventHash: input.eventHash ?? null,
      eventTimestamp: input.eventTimestamp ?? null,
      eventBlock: input.eventBlock ?? null,
      eventBlockHeight: input.eventBlockHeight ?? null,
      eventReceiver: input.eventReceiver ?? null,
      eventSender: input.eventSender ?? null,
      eventSubchain: input.eventSubchain ?? null,
      eventData: input.eventData ?? null,

      type: input.type ?? null,
      encodableType: input.encodableType ?? null,
      result: input.result ?? null,
    });

    // Guard: if we have eventHash, do a real UPSERT on that column
    if (input.eventHash) {
      await this.repo.upsert(entity, { conflictPaths: ['eventHash'], skipUpdateIfNoValuesChanged: true });
      // Return the updated row
      const row = await this.findByEventHash(input.eventHash);
      if (row) return row;
      // Fallback (shouldn’t happen): read-after-write miss
    }
    // No eventHash → plain insert
    return this.repo.save(entity);
  }

  async findByEventHash(hash: string): Promise<ChainEventEntity | null> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.eventHash = :hash', { hash })
      .orderBy('e.eventTimestamp', 'DESC', 'NULLS LAST')
      .addOrderBy('e.blockTimestamp', 'DESC')
      .getOne();
  }
}
