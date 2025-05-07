import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { GeckoTokenResponse } from '../types/gecko-terminal.types';

export interface CFRdata {
  priceUSD: number | null;
  tvlUSD: number | null;
}

// Fetch data of the CFR-token from CoinGecko's Terminal
@Injectable()
export class GeckoTerminalService {
  // Use the CFR-token contract address
  private readonly url = 'https://api.geckoterminal.com/api/v2/networks/defimetachain/tokens/0x29712FF76Aecb8b586F0d299A6Ce8b7e092A0a93';

  // Cache the fetched data for a certain amount of time
  private cachedPrice: number | null = null;
  private cachedTVL: number | null = null;
  private lastFetched: number = 0;
  //private readonly cacheTTL = 60_000;  // 60 seconds
  private readonly cacheTTL = 0;  // Disable caching, this is now done by the StatisticsService

  async getCFRpriceUSD(): Promise<number | null> {
    // Check the cache to see if new data needs to be fetched
    const now = Date.now();
    if (this.cachedPrice === null || now - this.lastFetched > this.cacheTTL) {
      await this.fetchData();
    }

    return this.cachedPrice;
  }

  async getCFRtvlUSD(): Promise<number | null> {
    // Check the cache to see if new data needs to be fetched
    const now = Date.now();
    if (this.cachedTVL === null || now - this.lastFetched > this.cacheTTL) {
      await this.fetchData();
    }

    return this.cachedTVL;
  }

  async getCFRdata(): Promise<CFRdata> {
    // Check the cache to see if new data needs to be fetched
    const now = Date.now();
    if (this.cachedTVL === null || now - this.lastFetched > this.cacheTTL) {
      await this.fetchData();
    }

    return {
      priceUSD: this.cachedPrice,
      tvlUSD: this.cachedTVL,
    };
  }

  // Fetch new data from the Gecko Terminal
  async fetchData() {
    try {
      const res = await fetch(this.url);
      const json = await res.json() as GeckoTokenResponse;
      const price = parseFloat(json.data.attributes.price_usd);
      const tvl = parseFloat(json.data.attributes.fdv_usd);  // Use the Fully Deluded Value as TVL

      // Cache it
      this.cachedPrice = price;
      this.cachedTVL = tvl;
      this.lastFetched = Date.now();
    } catch (err) {
      console.error('>>> Error fetching CFR token data:', err);
    }
  }
}