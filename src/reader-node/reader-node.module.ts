import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReaderNodeService } from './reader-node.service.js';
import { ReaderNodeController } from './reader-node.controller.js';


@Module({
  imports: [HttpModule],
  providers: [ReaderNodeService],
  controllers: [ReaderNodeController],
  exports: [ReaderNodeService],
})
export class ReaderNodeModule { }
