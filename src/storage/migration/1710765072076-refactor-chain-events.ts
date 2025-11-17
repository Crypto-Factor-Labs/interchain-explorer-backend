import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorChainEvents1710765072076 implements MigrationInterface {

  public async up(q: QueryRunner): Promise<void> {
    // ===== chain_events: fingerprint + partial unique indexes; drop data columns =====
    await q.query(`
      ALTER TABLE chain_events
        ADD COLUMN IF NOT EXISTS event_fingerprint text NULL
    `);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_chain_events_event_fingerprint
        ON chain_events (event_fingerprint)
        WHERE event_fingerprint IS NOT NULL
    `);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_chain_events_event_hash_real
        ON chain_events (event_hash)
        WHERE event_hash IS NOT NULL
    `);
    await q.query(`
      ALTER TABLE chain_events
        DROP COLUMN IF EXISTS transaction_data,
        DROP COLUMN IF EXISTS event_data
    `);

    // ===== execution_parts: add FK UUIDs + indexes; keep proofs; ensure old hash cols are gone =====
    await q.query(`
      ALTER TABLE execution_parts
        ADD COLUMN IF NOT EXISTS target_scheduling_event_id uuid,
        ADD COLUMN IF NOT EXISTS target_publish_event_id   uuid,
        ADD COLUMN IF NOT EXISTS target_execution_event_id uuid,
        ADD COLUMN IF NOT EXISTS mempool_commit_event_id   uuid
    `);

    await q.query(`
      ALTER TABLE execution_parts
        ADD COLUMN IF NOT EXISTS mempool_epoch_consensus_proof text,
        ADD COLUMN IF NOT EXISTS mempool_epoch_evm_proof       text
    `);

    // exec_parts FKs
    await q.query(`
      DO $$ BEGIN
        ALTER TABLE execution_parts
          ADD CONSTRAINT fk_ep_sched_event
          FOREIGN KEY (target_scheduling_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      DO $$ BEGIN
        ALTER TABLE execution_parts
          ADD CONSTRAINT fk_ep_publish_event
          FOREIGN KEY (target_publish_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      DO $$ BEGIN
        ALTER TABLE execution_parts
          ADD CONSTRAINT fk_ep_exec_event
          FOREIGN KEY (target_execution_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      DO $$ BEGIN
        ALTER TABLE execution_parts
          ADD CONSTRAINT fk_ep_commit_event
          FOREIGN KEY (mempool_commit_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_ep_sched_event_id   ON execution_parts (target_scheduling_event_id);
      CREATE INDEX IF NOT EXISTS idx_ep_publish_event_id ON execution_parts (target_publish_event_id);
      CREATE INDEX IF NOT EXISTS idx_ep_exec_event_id    ON execution_parts (target_execution_event_id);
      CREATE INDEX IF NOT EXISTS idx_ep_commit_event_id  ON execution_parts (mempool_commit_event_id);
    `);

    // Ensure legacy columns are dropped
    await q.query(`
      ALTER TABLE execution_parts
        DROP COLUMN IF EXISTS target_exec_tx_hash,
        DROP COLUMN IF EXISTS target_sched_tx_hash,
        DROP COLUMN IF EXISTS target_scheduling_event_hash,
        DROP COLUMN IF EXISTS target_publish_event_hash,
        DROP COLUMN IF EXISTS target_execution_event_hash,
        DROP COLUMN IF EXISTS mempool_commit_event_hash
    `);

    // ===== transactions: add FK UUIDs + indexes =====
    await q.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS source_chain_push_event_id uuid,
        ADD COLUMN IF NOT EXISTS state_validation_event_id  uuid
    `);

    await q.query(`
      DO $$ BEGIN
        ALTER TABLE transactions
          ADD CONSTRAINT fk_tx_source_push_event
          FOREIGN KEY (source_chain_push_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      DO $$ BEGIN
        ALTER TABLE transactions
          ADD CONSTRAINT fk_tx_state_validation_event
          FOREIGN KEY (state_validation_event_id) REFERENCES chain_events(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_source_push_event_id     ON transactions (source_chain_push_event_id);
      CREATE INDEX IF NOT EXISTS idx_tx_state_validation_event_id ON transactions (state_validation_event_id);
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    // transactions: drop FKs + columns + indexes
    await q.query(`DROP INDEX IF EXISTS idx_tx_state_validation_event_id`);
    await q.query(`DROP INDEX IF EXISTS idx_tx_source_push_event_id`);
    await q.query(`
      ALTER TABLE transactions
        DROP CONSTRAINT IF EXISTS fk_tx_state_validation_event,
        DROP CONSTRAINT IF EXISTS fk_tx_source_push_event
    `);
    await q.query(`
      ALTER TABLE transactions
        DROP COLUMN IF EXISTS state_validation_event_id,
        DROP COLUMN IF EXISTS source_chain_push_event_id
    `);

    // execution_parts: drop FK indexes & constraints & UUID cols
    await q.query(`DROP INDEX IF EXISTS idx_ep_commit_event_id`);
    await q.query(`DROP INDEX IF EXISTS idx_ep_exec_event_id`);
    await q.query(`DROP INDEX IF EXISTS idx_ep_publish_event_id`);
    await q.query(`DROP INDEX IF EXISTS idx_ep_sched_event_id`);

    await q.query(`
      ALTER TABLE execution_parts
        DROP CONSTRAINT IF EXISTS fk_ep_commit_event,
        DROP CONSTRAINT IF EXISTS fk_ep_exec_event,
        DROP CONSTRAINT IF EXISTS fk_ep_publish_event,
        DROP CONSTRAINT IF EXISTS fk_ep_sched_event
    `);
    await q.query(`
      ALTER TABLE execution_parts
        DROP COLUMN IF EXISTS mempool_commit_event_id,
        DROP COLUMN IF EXISTS target_execution_event_id,
        DROP COLUMN IF EXISTS target_publish_event_id,
        DROP COLUMN IF EXISTS target_scheduling_event_id
    `);

    // execution_parts: re-add legacy hash cols (nullable) for rollback-only
    await q.query(`
      ALTER TABLE execution_parts
        ADD COLUMN IF NOT EXISTS target_scheduling_event_hash text,
        ADD COLUMN IF NOT EXISTS target_publish_event_hash   text,
        ADD COLUMN IF NOT EXISTS target_execution_event_hash text,
        ADD COLUMN IF NOT EXISTS mempool_commit_event_hash   text,
        ADD COLUMN IF NOT EXISTS target_exec_tx_hash         text,
        ADD COLUMN IF NOT EXISTS target_sched_tx_hash        text
    `);

    // chain_events: restore data columns; drop indexes + fingerprint col
    await q.query(`DROP INDEX IF EXISTS ux_chain_events_event_hash_real`);
    await q.query(`DROP INDEX IF EXISTS ux_chain_events_event_fingerprint`);
    await q.query(`
      ALTER TABLE chain_events
        DROP COLUMN IF EXISTS event_fingerprint,
        ADD COLUMN IF NOT EXISTS transaction_data text,
        ADD COLUMN IF NOT EXISTS event_data       text
    `);
  }
}
