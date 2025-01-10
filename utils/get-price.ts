import TTLCache from "@isaacs/ttlcache";
import { priceSources } from "./price-sources";

// Caches the price of a ticker for 10 seconds (not symbol cache)
const cache = new TTLCache<string, SymbolPriceEntry | null>({ ttl: 1000 * 10 });

async function getPriceCached(ticker: string) {
	const cachedResult = cache.get(ticker)
	if (cachedResult !== undefined) { return cachedResult }
	else {
		const price = await getPrice(ticker)
		cache.set(ticker, price)
		return price
	}
}

async function getPrice(ticker: string) {
	for (const [src, fetcher] of priceSources) {
		const price = await fetcher(ticker)
		if (price) return { src, ...price }
	}

	return null
}

async function getPrices(tickers: string[]) {
	const uniqueTickers = [...new Set(tickers)]

	const priceEntries = (await Promise.all(uniqueTickers.map(getPriceCached)))

	const prices: SymbolPriceMap = priceEntries.reduce((acc, entry, i) => {
		acc[uniqueTickers[i]] = entry
		return acc
	}, {} as SymbolPriceMap)

	return prices
}

// Fetch TickerPriceMap for a list of tickers
async function getQuotes(tickers: string[]) {
	const uniqueSymbols = [...new Set(tickers.flatMap(ticker => ticker.split("/")))]
	const priceMap = await getPrices(uniqueSymbols)

	return tickers.reduce((acc, ticker) => {
		if (ticker.includes("/")) {
			const [from, to] = ticker.split("/")

			const entryFrom = priceMap[from]
			const entryTo = priceMap[to]
			if (entryFrom && entryTo) {
				acc[ticker] = {
					src: entryFrom.src !== entryTo.src ? [entryFrom.src, entryTo.src] : [entryFrom.src],
					price: entryFrom.price / entryTo.price,
					percentChange: entryFrom.percentChange !== null && entryTo.percentChange !== null
						? (((1 + entryFrom.percentChange / 100) / (1 + entryTo.percentChange / 100)) - 1) * 100
						: null,
					pair: true
				}
			}
		} else {
			const entry = priceMap[ticker]!
			if (priceMap[ticker]) {
				acc[ticker] = {
					src: [entry.src],
					price: entry.price,
					percentChange: entry.percentChange,
					pair: false
				}
			}
		}
		return acc
	}, {} as TickerPriceMap)
}

export { getPriceCached, getPrice, getPrices, getQuotes }