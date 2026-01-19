
export interface ExchangeRate {
  rate: number;
  lastUpdate: string;
  source: string;
}

export enum CurrencyType {
  USD = 'USD',
  VES = 'VES'
}
