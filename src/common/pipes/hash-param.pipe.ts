import { BadRequestException, PipeTransform } from '@nestjs/common';

export class HashParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Hash must be a string');
    }
    const v = value.trim();
    // Accept 32-byte hex with or without 0x; normalize to lowercase, no 0x
    const m = /^(?:0x)?([0-9a-fA-F]{64})$/.exec(v);
    if (!m) {
      throw new BadRequestException(
        'Invalid block hash: expected 32-byte hex (64 chars), with or without 0x',
      );
    }
    return m[1].toLowerCase();
  }
}
