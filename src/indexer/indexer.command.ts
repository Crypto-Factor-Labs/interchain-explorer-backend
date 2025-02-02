import { Command } from 'nestjs-command';  // Import Command decorator
import { Injectable } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Injectable()
export class IndexerCommand {
  constructor(private readonly indexerService: IndexerService) { }

  @Command({
    command: 'index:block',
    describe: 'Manually trigger the Indexer to create a new block',
  })
  async handle() {
    await this.indexerService.indexBlockManually();
    console.log('>>> Manual index of block triggered from CLI');
  }
}
