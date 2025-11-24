import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository, DeepPartial } from 'typeorm';
import type { ChainEventRepository, InsertByFingerprintInput } from './chain-event.repository.js';
import { ChainEventEntity } from '../entities/chain-event.entity.js';

@Injectable()
export class ChainEventPostgresRepository implements ChainEventRepository {
  private readonly repo: Repository<ChainEventEntity>;
  constructor(ds: DataSource) {
    this.repo = ds.getRepository(ChainEventEntity);
  }

  /**
   * Insert once, keyed by event_fingerprint.
   * - If a row with the same fingerprint already exists, return it (no updates).
   * - Otherwise insert a new row with that fingerprint + payload.
   */
  async insertIfMissingByFingerprint(input: InsertByFingerprintInput): Promise<ChainEventEntity> {
    const { fingerprint: eventFingerprint, payload } = input;

    // Return existing if present
    const existing = await this.findByFingerprint(eventFingerprint);
    if (existing) return existing;

    // Prepare entity
    const data: DeepPartial<ChainEventEntity> = {
      eventFingerprint,

      // event-level
      eventHash: payload.eventHash,
      eventTimestamp: payload.eventTimestamp,
      eventBlock: payload.eventBlock,
      eventBlockHeight: payload.eventBlockHeight,
      eventReceiver: payload.eventReceiver,
      eventSender: payload.eventSender,
      eventSubchain: payload.eventSubchain,

      // tx-level
      transactionHash: payload.transactionHash,
      transactionReceiver: payload.transactionReceiver,
      transactionSender: payload.transactionSender,
      transactionSubchain: payload.transactionSubchain,

      // block-level
      blockHash: payload.blockHash,
      blockHeight: payload.blockHeight,
      blockTimestamp: payload.blockTimestamp,
      blockSubchain: payload.blockSubchain,

      // meta
      type: payload.type,
      encodableType: payload.encodableType,

      // result snapshot (nullable)
      result: payload.result ?? null,
    };

    const entity = this.repo.create(data);

    // Insert; if concurrent writer raced us, unique violation → select again.
    try {
      const saved = await this.repo.save(entity);
      return saved;
    } catch (e: any) {
      // 23505 = unique_violation
      if (e?.code !== '23505') throw e;
      const row = await this.findByFingerprint(eventFingerprint);
      if (row) return row;
      // Extremely unlikely: if still missing, rethrow
      throw e;
    }
  }

  async findById(id: string): Promise<ChainEventEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByFingerprint(fp: string): Promise<ChainEventEntity | null> {
    return this.repo.findOne({ where: { eventFingerprint: fp } });
  }

  async findByIds(ids: string[]): Promise<ChainEventEntity[]> {
    if (!ids?.length) return [];
    const unique = Array.from(new Set(ids));
    return this.repo.find({ where: { id: In(unique) } });
  }
}
