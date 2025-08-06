import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { MasterBlockSummary, MasterBlock } from '../types/masterblock.types.js';

@Injectable()
export class ReaderNodeService {
  private readonly baseUrl = 'https://interchain-testnet.labs.crypto-factor.io/reader-node/blockchain';

  constructor(private readonly httpService: HttpService) { }

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
  async fetchMasterBlock(height: number): Promise<MasterBlock> {
    const url = `${this.baseUrl}/master-block?height=${height}&format=3`;
    const response = await firstValueFrom(this.httpService.get<MasterBlock>(url));
    return response.data;
  }
}
