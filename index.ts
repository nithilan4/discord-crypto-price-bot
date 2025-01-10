import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { getQuotes } from 'utils/get-price';
import fs from "fs"

// Map from userId to map from alias to tickers
let aliases: Record<string, Record<string, string[]>> = {}
function saveAliases() {
	fs.writeFileSync("aliases.json", JSON.stringify(aliases))
}

if (fs.existsSync("aliases.json")) {
	aliases = JSON.parse(fs.readFileSync("aliases.json").toString())
} else {
	saveAliases()
}

const emojiMap: Record<PriceSource, string> = {
	"binance": "<:binance:1327058198934589570>",
	"cmc": "<:cmc:1327058108073377912>"
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });


client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

async function getPricesMessage(tickers: string[]) {
	const quoteMap = await getQuotes(tickers)

	return tickers.map(ticker => {
		const priceEntry = quoteMap[ticker]
		if (priceEntry) {
			const emojis = priceEntry.src.map(src => emojiMap[src]).join(" ")
			const tickerFormatted = ticker.toUpperCase()
			const prefix = !priceEntry.pair ? "$" : ""
			const priceFormatted = priceEntry.price.toLocaleString(undefined, { minimumSignificantDigits: 4, maximumFractionDigits: 6, minimumFractionDigits: 2, roundingPriority: 'lessPrecision' })
			const percentChangeFormatted = priceEntry.percentChange?.toFixed(2) ?? "N/A"

			return `${emojis} ${tickerFormatted}: ${prefix}${priceFormatted} [${percentChangeFormatted}%]`
		} else {
			return `🚫 ${ticker}: N/A`
		}
	}).join("\n")
}

client.on(Events.MessageCreate, async (msg) => {
	if (msg.content === "z") {
		if (aliases[msg.author.id]?.["."]) {
			msg.channel.send(await getPricesMessage(aliases[msg.author.id]["."]))
		} else {
			msg.channel.send("❌ No default alias set. Use \"zset . <tickers>\" to set a default alias.")
		}
	} else if (msg.content.startsWith("z ")) {
		let tickers = msg.content.split(" ").slice(1)

		if (tickers.length === 1 && aliases[msg.author.id]?.[tickers[0]]) {
			tickers = aliases[msg.author.id][tickers[0]]
		}

		msg.channel.send(await getPricesMessage(tickers))
	} else if (msg.content.startsWith("zset ")) {
		const split = msg.content.split(" ")
		const alias = split[1]
		const tickers = split.slice(2)

		if (tickers.length > 0) {
			aliases[msg.author.id] = {
				...(aliases[msg.author.id] ?? {}),
				[alias]: tickers
			}
			saveAliases()

			msg.channel.send(`✅ Set alias **${alias === "." ? `. (default)` : alias}** to ${tickers.map(ticker => ticker.toUpperCase()).join(", ")}!`)
		} else {
			msg.channel.send("❌ Select one or more tickers to set to this alias")
		}
	} else if (msg.content.startsWith("zdel ")) {
		const split = msg.content.split(" ")
		const alias = split[1]

		delete aliases[msg.author.id]?.[alias]
		saveAliases()

		msg.channel.send(`✅ Deleted alias **${alias === "." ? `. (default)` : alias}**!`)
	} else if (msg.content === "zlist") {
		msg.channel.send(Object.entries(aliases[msg.author.id] ?? {}).map(([alias, tickers]) => `**${alias === "." ? ". (default)" : alias}**: ${tickers.join(", ")}`).join("\n"))
	}
});

// Log in to Discord with your client's token
client.login(process.env.TOKEN);