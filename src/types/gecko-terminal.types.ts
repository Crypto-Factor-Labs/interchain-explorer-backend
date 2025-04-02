export interface GeckoTokenResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      image_url: string;
      coingecko_coin_id: string | null;
      total_supply: string;
      price_usd: string;
      fdv_usd: string;
      total_reserve_in_usd: string;
      volume_usd: {
        h24: string;
      };
      market_cap_usd: string | null;
    };
    relationships: {
      top_pools: {
        data: {
          id: string;
          type: string;
        }[];
      };
    };
  };
}
