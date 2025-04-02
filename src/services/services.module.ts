import { Module } from '@nestjs/common';
import { TokenPriceService } from './token-price.service.js';

@Module({
  providers: [TokenPriceService],
  exports: [TokenPriceService],
})
export class ServicesModule { }
