import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExecPartsAndTxHashUniqueIndexes1710765072074 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // execution_parts: unique (tx_hash, part_index) for non-revert parts
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_execution_parts_txhash_partidx_nonrevert
      ON execution_parts (transaction_hash, part_index)
      WHERE is_revert = false
    `);

    // execution_parts: at most one revert row per transaction
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_execution_parts_txhash_revert
      ON execution_parts (transaction_hash)
      WHERE is_revert = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_execution_parts_txhash_revert`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_execution_parts_txhash_partidx_nonrevert`);
  }
}
