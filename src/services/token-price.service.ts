import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { GeckoTokenResponse } from '../types/gecko-terminal.types';

@Injectable()
export class TokenPriceService {
  // Fetch the CFR price from CoinGecko
  private readonly url = 'https://api.geckoterminal.com/api/v2/networks/defimetachain/tokens/0x29712FF76Aecb8b586F0d299A6Ce8b7e092A0a93';

  // Cache the price for a certain amount of time
  private cachedPrice: number | null = null;
  private lastFetched: number = 0;
  private readonly cacheTTL = 60_000; // 60 seconds

  async getCFRpriceUSD(): Promise<number | null> {
    const now = Date.now();

    // Check cache
    if (this.cachedPrice !== null && now - this.lastFetched < this.cacheTTL) {
      return this.cachedPrice;
    }

    // Fetch new data
    try {
      const res = await fetch(this.url);
      const json = await res.json() as GeckoTokenResponse;
      const price = parseFloat(json.data.attributes.price_usd);

      // Cache it
      this.cachedPrice = price;
      this.lastFetched = now;
      return price;
    } catch (err) {
      console.error('Error fetching token price:', err);
      return this.cachedPrice; // fallback to last known value
    }
  }
}
