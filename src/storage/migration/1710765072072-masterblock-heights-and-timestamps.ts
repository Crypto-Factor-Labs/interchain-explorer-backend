import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasterBlockHeightsAndTimestamps1710765072072 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // height: bigint -> numeric(78,0)
    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "height" TYPE numeric(78,0)
      USING "height"::numeric
    `);

    // timestamps: timestamp -> timestamptz
    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "timestamp" TYPE timestamptz
      USING "timestamp"
    `);

    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "indexed_at" TYPE timestamptz
      USING "indexed_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // revert timestamps first
    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "indexed_at" TYPE timestamp
      USING "indexed_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "timestamp" TYPE timestamp
      USING "timestamp"
    `);

    // height back to bigint (may fail if values overflow bigint)
    await queryRunner.query(`
      ALTER TABLE "master_chain_blocks"
      ALTER COLUMN "height" TYPE bigint
      USING "height"::bigint
    `);
  }
}
