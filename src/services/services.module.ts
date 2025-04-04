import { Module } from '@nestjs/common';
import { GeckoTerminalService } from './gecko-terminal.service.js';

@Module({
  providers: [GeckoTerminalService],
  exports: [GeckoTerminalService],
})
export class ServicesModule { }
