import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateInterchainSchema_1710765072069 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM type for execution_part_type
    await queryRunner.query(`CREATE TYPE execution_part_type AS ENUM ('revert', 'execution')`);

    // Enable pgcrypto extension for UUID generation
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create master_chain_blocks table
    await queryRunner.createTable(
      new Table({
        name: "master_chain_blocks",
        columns: [
          {
            name: "height",
            type: "bigint",
            isNullable: false
          },
          {
            name: "block_hash",
            type: "text",
            isPrimary: true
          },
          {
            name: "timestamp",
            type: "timestamp",
            isNullable: false
          },
          {
            name: "merkle_root",
            type: "text",
            isNullable: false
          },
          {
            name: "block_mint_transaction",
            type: "text",
            isNullable: false
          },
          {
            name: "indexed_at",
            type: "timestamp",
            isNullable: false,
            default: "NOW()"
          }
        ],
        uniques: [
          { columnNames: ["height"] },
          { columnNames: ["block_mint_transaction"] }
        ]
      }),
      true
    );

    // Create indexes for master_chain_blocks
    await queryRunner.createIndex(
      "master_chain_blocks",
      new TableIndex({
        name: "idx_master_chain_blocks_height",
        columnNames: ["height"]
      })
    );
    await queryRunner.createIndex(
      "master_chain_blocks",
      new TableIndex({
        name: "idx_master_chain_blocks_timestamp",
        columnNames: ["timestamp"]
      })
    );

    // Create master_chain_block_signatures table
    await queryRunner.createTable(
      new Table({
        name: "master_chain_block_signatures",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()"
          },
          {
            name: "master_chain_block_hash",
            type: "text",
            isNullable: true
          },
          {
            name: "operator_node_address",
            type: "text",
            isNullable: false
          },
          {
            name: "signature",
            type: "text",
            isNullable: false
          },
          {
            name: "indexed_at",
            type: "timestamp",
            default: "NOW()"
          }
        ]
      }),
      true
    );

    // Add foreign key for master_chain_block_signatures referencing master_chain_blocks
    await queryRunner.createForeignKey(
      "master_chain_block_signatures",
      new TableForeignKey({
        columnNames: ["master_chain_block_hash"],
        referencedTableName: "master_chain_blocks",
        referencedColumnNames: ["block_hash"],
        onDelete: "CASCADE"
      })
    );

    // Create partial_chains table
    await queryRunner.createTable(
      new Table({
        name: "partial_chains",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()"
          },
          {
            name: "chain_id",
            type: "integer",
            isNullable: false
          },
          {
            name: "chain_name",
            type: "text",
            isNullable: false
          },
          {
            name: "partial_chain_address",
            type: "text",
            isNullable: false
          },
          {
            name: "mempool_address",
            type: "text",
            isNullable: false
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "NOW()"
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "NOW()"
          }
        ],
        uniques: [{ columnNames: ["chain_id"] }]
      }),
      true
    );

    // Create partial_chain_blocks table
    await queryRunner.createTable(
      new Table({
        name: "partial_chain_blocks",
        columns: [
          {
            name: "chain_id",
            type: "integer",
            isNullable: false
          },
          {
            name: "height",
            type: "bigint",
            isNullable: false
          },
          {
            name: "block_hash",
            type: "text",
            isPrimary: true
          },
          {
            name: "master_block_hash",
            type: "text",
            isNullable: false
          },
          {
            name: "mempool_epoch",
            type: "integer",
            isNullable: false
          },
          {
            name: "txn_root",
            type: "text",
            isNullable: false
          },
          {
            name: "source_txn_hash",
            type: "text",
            isNullable: false
          },
          {
            name: "commit_txn_hash",
            type: "text",
            isNullable: false
          },
          {
            name: "commit_proof",
            type: "text",
            isNullable: false
          },
          {
            name: "confirmed",
            type: "boolean",
            isNullable: false,
            default: "false"
          },
          {
            name: "indexed_at",
            type: "timestamp",
            default: "NOW()"
          }
        ],
        uniques: [{ columnNames: ["chain_id", "height"] }]
      }),
      true
    );

    // Create index on partial_chain_blocks (chain_id, height)
    await queryRunner.createIndex(
      "partial_chain_blocks",
      new TableIndex({
        name: "idx_partial_chain_blocks_chain_id_height",
        columnNames: ["chain_id", "height"]
      })
    );

    // Add foreign key for partial_chain_blocks referencing master_chain_blocks
    await queryRunner.createForeignKey(
      "partial_chain_blocks",
      new TableForeignKey({
        columnNames: ["master_block_hash"],
        referencedTableName: "master_chain_blocks",
        referencedColumnNames: ["block_hash"],
        onDelete: "CASCADE"
      })
    );

    // Create partial_block_execution_parts table
    await queryRunner.createTable(
      new Table({
        name: "partial_block_execution_parts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()"
          },
          {
            name: "partial_block_hash",
            type: "text",
            isNullable: true
          },
          {
            name: "type",
            type: "execution_part_type",
            isNullable: false
          },
          {
            name: "operator_address",
            type: "text",
            isNullable: false
          },
          {
            name: "execution_hex_encoded",
            type: "text",
            isNullable: false
          },
          {
            name: "executed",
            type: "boolean",
            isNullable: false,
            default: "false"
          },
          {
            name: "successful",
            type: "boolean",
            isNullable: true
          },
          {
            name: "indexed_at",
            type: "timestamp",
            default: "NOW()"
          }
        ]
      }),
      true
    );

    // Add foreign key for partial_block_execution_parts referencing partial_chain_blocks
    await queryRunner.createForeignKey(
      "partial_block_execution_parts",
      new TableForeignKey({
        columnNames: ["partial_block_hash"],
        referencedTableName: "partial_chain_blocks",
        referencedColumnNames: ["block_hash"],
        onDelete: "CASCADE"
      })
    );

    // Create indexes for partial_block_execution_parts
    await queryRunner.createIndex(
      "partial_block_execution_parts",
      new TableIndex({
        name: "idx_partial_block_execution_parts_type",
        columnNames: ["type"]
      })
    );
    await queryRunner.createIndex(
      "partial_block_execution_parts",
      new TableIndex({
        name: "idx_partial_block_execution_parts_executed",
        columnNames: ["executed"]
      })
    );

    // Create indexer_lock table
    await queryRunner.createTable(
      new Table({
        name: "indexer_lock",
        columns: [
          {
            name: "id",
            type: "serial",
            isPrimary: true
          },
          {
            name: "job_name",
            type: "varchar",
            length: "255",
            isNullable: false
          },
          {
            name: "is_running",
            type: "boolean",
            isNullable: false,
            default: "false"
          },
          {
            name: "last_updated",
            type: "timestamp",
            default: "NOW()"
          }
        ],
        uniques: [{ columnNames: ["job_name"] }]
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexer_lock table
    await queryRunner.dropTable("indexer_lock");

    // Drop foreign key and indexes for partial_block_execution_parts, then drop the table
    const tableExecParts = await queryRunner.getTable("partial_block_execution_parts");
    if (tableExecParts) {
      const fkExecParts = tableExecParts.foreignKeys.find(fk => fk.columnNames.indexOf("partial_block_hash") !== -1);
      if (fkExecParts) {
        await queryRunner.dropForeignKey("partial_block_execution_parts", fkExecParts);
      }
      await queryRunner.dropIndex("partial_block_execution_parts", "idx_partial_block_execution_parts_type");
      await queryRunner.dropIndex("partial_block_execution_parts", "idx_partial_block_execution_parts_executed");
      await queryRunner.dropTable("partial_block_execution_parts");
    }

    // Drop foreign key and index for partial_chain_blocks, then drop the table
    const tablePartialChainBlocks = await queryRunner.getTable("partial_chain_blocks");
    if (tablePartialChainBlocks) {
      const fkPartialChain = tablePartialChainBlocks.foreignKeys.find(fk => fk.columnNames.indexOf("master_block_hash") !== -1);
      if (fkPartialChain) {
        await queryRunner.dropForeignKey("partial_chain_blocks", fkPartialChain);
      }
      await queryRunner.dropIndex("partial_chain_blocks", "idx_partial_chain_blocks_chain_id_height");
      await queryRunner.dropTable("partial_chain_blocks");
    }

    // Drop partial_chains table
    await queryRunner.dropTable("partial_chains");

    // Drop foreign key for master_chain_block_signatures, then drop the table
    const tableSignatures = await queryRunner.getTable("master_chain_block_signatures");
    if (tableSignatures) {
      const fkSignatures = tableSignatures.foreignKeys.find(fk => fk.columnNames.indexOf("master_chain_block_hash") !== -1);
      if (fkSignatures) {
        await queryRunner.dropForeignKey("master_chain_block_signatures", fkSignatures);
      }
      await queryRunner.dropTable("master_chain_block_signatures");
    }

    // Drop indexes for master_chain_blocks and then drop the table
    await queryRunner.dropIndex("master_chain_blocks", "idx_master_chain_blocks_height");
    await queryRunner.dropIndex("master_chain_blocks", "idx_master_chain_blocks_timestamp");
    await queryRunner.dropTable("master_chain_blocks");

    // Finally, drop the ENUM type for execution_part_type
    await queryRunner.query(`DROP TYPE execution_part_type`);
  }
}
