import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column } from 'typeorm';

@Entity('cfr_price_history')
export class CfrPriceHistoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'timestamp' })
  timestamp!: Date;

  @Column('numeric', { precision: 18, scale: 8, name: 'price_usd' })
  priceUsd!: string;

  @Column('numeric', { precision: 18, scale: 8, name: 'tvl_usd' })
  tvlUsd!: string;
}
