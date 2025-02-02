import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('master_chain_blocks')  // Table name
export class MasterChainBlock {
  @PrimaryGeneratedColumn('uuid')  // Let the database automatically generate UUIDs
  id!: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  height!: number;

  @Column('timestamp')
  timestamp!: Date;

  @Column('text')
  merkle_root!: string;

  @Column('text')
  block_hash!: string;

  @Column('text')
  block_mint_transaction!: string;

  @Column('timestamp')
  date_indexed!: Date;
}
