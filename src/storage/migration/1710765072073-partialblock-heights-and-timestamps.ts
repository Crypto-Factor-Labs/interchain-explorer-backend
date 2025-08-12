import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartialBlockHeightsAndTimestamps1710765072073 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // height: bigint -> numeric(78,0)
    await queryRunner.query(`
      ALTER TABLE "partial_chain_blocks"
      ALTER COLUMN "height" TYPE numeric(78,0)
      USING "height"::numeric
    `);

    // indexed_at: timestamp -> timestamptz
    await queryRunner.query(`
      ALTER TABLE "partial_chain_blocks"
      ALTER COLUMN "indexed_at" TYPE timestamptz
      USING "indexed_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "partial_chain_blocks"
      ALTER COLUMN "indexed_at" TYPE timestamp
      USING "indexed_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "partial_chain_blocks"
      ALTER COLUMN "height" TYPE bigint
      USING "height"::bigint
    `);
  }
}
