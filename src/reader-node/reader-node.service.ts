import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import BN from 'bn.js';
import type { MasterBlockSummary, MasterBlock } from './types/masterblock.types.js';
import type { PartialBlock } from './types/partialblock.types.js';
import type { Transaction } from './types/transaction.types.js';
import { toDecimalString } from './ingest-helpers.js';

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
  async fetchLatestMasterBlock(): Promise<MasterBlockSummary> {
    const url = `${this.baseUrl}/master-block?format=1`;
    const response = await firstValueFrom(this.httpService.get<MasterBlockSummary>(url));
    return response.data;
  }

  /**
   * Fetch a full MasterBlock by height (format=3)
   * @param height - The height of the block to fetch
   */
  async fetchMasterBlockByHeight(height: string | number | BN): Promise<MasterBlock> {
    const heightDec = toDecimalString(height);
    if (!heightDec) throw new Error(`Invalid height: ${String(height)}`);

    const url = `${this.baseUrl}/master-block?height=${heightDec}&format=3`;
    const { data } = await firstValueFrom(this.httpService.get<MasterBlock>(url));
    return data;
  }

  /**
   * Fetch a full MasterBlock by hash (format=3)
   * @param hash - The hash of the block to fetch
   */
  async fetchMasterBlockByHash(blockHash: string): Promise<MasterBlock> {
    if (!blockHash) throw new Error('blockHash is required');
    const url = `${this.baseUrl}/master-block/hash=${encodeURIComponent(blockHash)}?format=3`;
    const { data } = await firstValueFrom(this.httpService.get<MasterBlock>(url));
    return data;
  }

  /**
   * Fetch a PartialBlock by chain ID and hash (format=3)
   * @param chainId - The ID of the chain
   * @param hash - The hash of the block to fetch
   */
  async fetchPartialBlock(chainId: number, hash: string): Promise<PartialBlock> {
    const url = `${this.baseUrl}/partial-block/${chainId}?hash=${hash}&format=3`;
    const response = await firstValueFrom(this.httpService.get<PartialBlock>(url));
    return response.data;
  }

  /**
   * Fetch a transaction by its hash (format=3)
   * @param txHash - The hash of the transaction to fetch
   */
  async fetchTransaction(txHash: string): Promise<Transaction> {
    const url = `${this.baseUrl}/transaction/${txHash}?format=3`;
    const response = await firstValueFrom(this.httpService.get<Transaction>(url));
    return response.data;
  }

  /**
   * Fetch the latest MasterBlock height
   * @returns The height of the latest MasterBlock
   */
  async getLatestHeight(): Promise<BN> {
    const summary = await this.fetchLatestMasterBlock();
    return new BN(summary.height);
  }
}
