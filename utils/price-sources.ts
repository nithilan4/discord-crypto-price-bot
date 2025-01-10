const getBinancePrice: PriceFetcher = async (ticker: string) => {
	const symbol = ticker.includes("/") ? ticker.toUpperCase().replaceAll("/", "") : `${ticker.toUpperCase()}USDT`
	const res = await fetch(`https://www.binance.com/api/v3/ticker?symbol=${symbol}`).then(res => res.json()).catch(() => null)
	if (res && res.symbol) {
		return { price: +res.lastPrice, percentChange: +res.priceChangePercent }
	}

	return null
}

const getCMCPrice: PriceFetcher = async (ticker: string) => {
	const res = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${ticker.toUpperCase()}&CMC_PRO_API_KEY=${process.env.CMC_API_KEY}`).then(res => res.json()).catch(() => null)

	if (res?.data?.[ticker.toUpperCase()]?.[0]) {
		const data = res.data[ticker.toUpperCase()][0]
		return { price: data.quote.USD.price, percentChange: data.quote.USD.percent_change_24h }
	}

	return null
}

// First price source is the default
export const priceSources: [PriceSource, PriceFetcher][] = [["binance", getBinancePrice], ["cmc", getCMCPrice]]