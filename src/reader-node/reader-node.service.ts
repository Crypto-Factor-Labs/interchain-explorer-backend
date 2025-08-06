import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { MasterBlockSummary, MasterBlock } from '../types/masterblock.types.js';
import BN from 'bn.js';

@Injectable()
export class ReaderNodeService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const base = this.configService.get<string>('READER_NODE_URL')!
    this.baseUrl = (base.endsWith('/') ? base : base + '/') + 'blockchain';
  }

  /**
   * Fetch the summary of the latest MasterBlock (format=1)
   */
  async fetchMasterBlockSummary(): Promise<MasterBlockSummary> {
    const url = `${this.baseUrl}/master-block?format=1`;
    const response = await firstValueFrom(this.httpService.get<MasterBlockSummary>(url));
    return response.data;
  }

  /**
   * Fetch a full MasterBlock by height (format=3)
   * @param height - The height of the block to fetch
   */
  async fetchMasterBlock(height: BN): Promise<MasterBlock> {
    const heightNumber = height.toNumber();
    if (!Number.isSafeInteger(heightNumber)) {
      throw new Error(`🛑 Height ${height.toString()} is too large to safely convert to number`);
    }
    const url = `${this.baseUrl}/master-block?height=${heightNumber}&format=3`;
    const response = await firstValueFrom(this.httpService.get<MasterBlock>(url));
    return response.data;
  }

  /**
   * Fetch the latest MasterBlock height
   * @returns The height of the latest MasterBlock
   */
  async getLatestHeight(): Promise<BN> {
    const summary = await this.fetchMasterBlockSummary();
    return new BN(summary.height);
  }
}
