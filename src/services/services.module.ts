import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { GeckoTerminalService } from './gecko-terminal.service.js';
import { PriceUpdaterService } from './cfr-price-updater.service.js';
@Module({
  imports: [StorageModule],  // for CfrPriceHistoryRepository for the PriceUpdaterService
  providers: [GeckoTerminalService, PriceUpdaterService],
  exports: [GeckoTerminalService, PriceUpdaterService],
})
export class ServicesModule { }
