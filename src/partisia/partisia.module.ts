// src/partisia/partisia.module.ts
import { Module } from '@nestjs/common';
import { PartisiaService } from './partisia.service';

@Module({
  providers: [PartisiaService],
  exports: [PartisiaService],
})
export class PartisiaModule { }
