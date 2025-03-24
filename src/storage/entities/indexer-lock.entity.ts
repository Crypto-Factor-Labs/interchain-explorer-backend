import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('indexer_lock')  // Table name
export class IndexerLockEntity {
  @PrimaryColumn()
  job_name!: string;

  @Column()
  is_running!: boolean;

  @Column()
  last_updated!: Date;
}
