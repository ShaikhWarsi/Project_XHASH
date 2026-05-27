export type DataProviderName =
  | 'yfinance'
  | 'alpaca'
  | 'ccxt'
  | 'finnhub'
  | 'fred'
  | 'sec'
  | 'databento'
  | 'openbb';

export type DataCategory =
  | 'equity'
  | 'crypto'
  | 'forex'
  | 'futures'
  | 'options'
  | 'economic';

export type Timeframe =
  | '1m' | '5m' | '15m' | '30m'
  | '1h' | '4h' | '1d' | '1w' | '1M';

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: Date;
}

export interface OrderBook {
  symbol: string;
  bids: [price: number, quantity: number][];
  asks: [price: number, quantity: number][];
  timestamp: Date;
}

export interface FundamentalData {
  symbol: string;
  incomeStatement: Record<string, unknown>;
  balanceSheet: Record<string, unknown>;
  cashFlow: Record<string, unknown>;
  ratios: Record<string, number>;
  earningsDates: Date[];
  dividends: { date: Date; amount: number }[];
}

export interface MarketNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  symbols: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

export interface ProviderCapabilities {
  historical: boolean;
  realtime: boolean;
  level2: boolean;
  news: boolean;
  fundamentals: boolean;
  options: boolean;
  forex: boolean;
  crypto: boolean;
  futures: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ProviderConfig {
  name: DataProviderName;
  enabled: boolean;
  priority: number;
  rateLimit: number;
  cache: {
    enabled: boolean;
    ttl: number;
  };
  credentials: ProviderCredentials;
}

export interface QueryParams {
  symbol: string;
  startDate?: Date;
  endDate?: Date;
  timeframe?: Timeframe;
  limit?: number;
  category?: DataCategory;
}

export interface ProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider: DataProviderName;
  cached: boolean;
  timestamp: Date;
}

export interface ProviderStats {
  requests: number;
  successes: number;
  failures: number;
  avgLatency: number;
  cacheHitRate: number;
}

export interface IDataProvider {
  readonly name: DataProviderName;
  readonly capabilities: ProviderCapabilities;

  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  fetchOHLCV(params: QueryParams): Promise<ProviderResponse<OHLCV[]>>;
  fetchQuote(symbol: string): Promise<ProviderResponse<Quote>>;
  fetchOrderBook(symbol: string, depth?: number): Promise<ProviderResponse<OrderBook>>;

  fetchFundamentals(symbol: string): Promise<ProviderResponse<FundamentalData>>;
  fetchEarnings(symbol: string): Promise<ProviderResponse<Date[]>>;
  fetchDividends(symbol: string): Promise<ProviderResponse<{ date: Date; amount: number }[]>>;

  fetchNews(symbol?: string, limit?: number): Promise<ProviderResponse<MarketNews[]>>;

  searchSymbols(query: string): Promise<ProviderResponse<string[]>>;
  getStats(): ProviderStats;
}

export interface IProviderRegistry {
  register(provider: IDataProvider): void;
  unregister(name: DataProviderName): void;
  get(name: DataProviderName): IDataProvider | undefined;
  getAll(): IDataProvider[];
  getByCapability<K extends keyof ProviderCapabilities>(
    capability: K,
    value: boolean
  ): IDataProvider[];
  listNames(): DataProviderName[];
}

export interface IQueryExecutor {
  execute<T>(
    query: QueryParams,
    providers: IDataProvider[]
  ): Promise<ProviderResponse<T>>;

  executeWithFallback<T>(
    query: QueryParams,
    providers: IDataProvider[]
  ): Promise<ProviderResponse<T>>;

  executeWithPriority<T>(
    query: QueryParams,
    providers: IDataProvider[]
  ): Promise<ProviderResponse<T>>;
}

export interface ICache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  getStats(): { hits: number; misses: number; size: number };
}
