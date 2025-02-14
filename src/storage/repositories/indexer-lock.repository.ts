import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndexerLock } from '../entities/indexer-lock.entity.js';

@Injectable()
export class IndexerLockRepository {
  constructor(
    // Inject the repository for IndexerLock
    @InjectRepository(IndexerLock)
    private readonly lockRepo: Repository<IndexerLock>,
  ) { }

  /**
   * Check if an indexing job is already running.
   */
  async isIndexingInProgress(): Promise<boolean> {
    const result = await this.lockRepo.findOne({ where: { job_name: 'block_indexer' } });
    return result ? result.is_running : false;  // Return true if the lock is active, false otherwise
  }

  /**
   * Acquire the indexing lock to prevent duplicate execution.
   */
  async acquireLock(): Promise<void> {
    let lock = await this.lockRepo.findOne({ where: { job_name: 'block_indexer' } });

    if (lock) {
      // If lock exists, update it
      lock.is_running = true;
      lock.last_updated = new Date();
      await this.lockRepo.save(lock);  // Update the lock entry in the database
    } else {
      // If no lock exists, create a new lock entry
      lock = this.lockRepo.create({
        job_name: 'block_indexer',
        is_running: true,
        last_updated: new Date(),
      });
      await this.lockRepo.save(lock);  // Save the new lock entry
    }
  }

  /**
   * Release the indexing lock after processing.
   */
  async releaseLock(): Promise<void> {
    const lock = await this.lockRepo.findOne({ where: { job_name: 'block_indexer' } });
    if (lock) {
      lock.is_running = false;
      lock.last_updated = new Date();
      await this.lockRepo.save(lock);  // Update the lock entry to mark it as not running
    }
  }
}
