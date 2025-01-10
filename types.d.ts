type PriceSource = "binance" | "cmc"

// SINGLE COIN ENTRY
type SymbolPriceEntry = { src: PriceSource, price: number, percentChange: number | null }

// SINGLE/MULTI COIN ENTRY
type TickerPriceEntry = { src: PriceSource[], price: number, percentChange: number | null, pair: boolean }

type PriceFetcher = (ticker: string) => Promise<Omit<SymbolPriceEntry, "src"> | null>

type TickerPriceMap = Record<string, TickerPriceEntry | null>
type SymbolPriceMap = Record<string, SymbolPriceEntry | null>
