export type ChainEventStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'revert'
  | 'skipped';

export interface ChainEventDto {
  name: string;
  status: ChainEventStatus;
  timestamp?: string;   // ISO
  eventHash?: string;
}

export type ChainEvents = [ChainEventDto, ChainEventDto, ChainEventDto, ChainEventDto];
