import 'dotenv/config'

import { median, sleep } from '../utils'
import { sendMessage } from '../api/telegram'
import { format } from 'date-fns'
import { getCSFloatListings, getCSFloatSimpleListings } from '../api/csfloat'

const CASHED_LISTINGS = new Set<string>()

const MIN_PRICE = 500
const MAX_PRICE = 10000

const init = async () => {
  const response = await getCSFloatListings({
    sort_by: 'most_recent',
    min_price: MIN_PRICE,
    max_price: MAX_PRICE,
    max_float: 0.5,
  })

  for (const data of response.data) {
    const now = format(new Date(), 'HH:mm:ss')

    if (CASHED_LISTINGS.has(data.id)) continue

    const currentPrice = data.price
    const quantity = data.reference.quantity
    const basePrice = data.reference.base_price
    const totalTrades = data.seller.statistics.total_trades || 0
    const market_hash_name = data.item.market_hash_name

    const charm = data.item.keychains?.[0]
    const charmPrice = charm?.reference?.price || 0

    if (
      !charm ||
      charmPrice === 0 ||
      basePrice < MIN_PRICE ||
      basePrice > MAX_PRICE ||
      currentPrice < MIN_PRICE ||
      currentPrice > MAX_PRICE ||
      quantity <= 100 ||
      totalTrades >= 10
    ) {
      continue
    }

    const simpleListings = await getCSFloatSimpleListings({ id: data.id })

    const filteredListings = simpleListings.filter((i) => i.type === 'buy_now')
    const listingMedianPrice = median(filteredListings.map((i) => i.price))
    const listingLowestPrice = filteredListings.sort((a, b) => a.price - b.price)[0].price
    const listingFinalLowestPrice = listingLowestPrice - charmPrice + 33

    const estimatedProfit = ((listingMedianPrice - listingFinalLowestPrice) / listingFinalLowestPrice) * 100

    const floatLink = `https://csfloat.com/search?market_hash_name=${market_hash_name}&sort_by=lowest_price&type=buy_now`

    console.log(now, market_hash_name, estimatedProfit.toFixed(2) + '%')

    if (estimatedProfit >= 5) {
      const message: string[] = []
      message.push(`<a href="${floatLink}">${market_hash_name}</a>\n\n`)

      message.push(`<b>${charm.name}</b> ($${charmPrice / 100}) #${charm.pattern}\n\n`)

      message.push(`<b>Price</b>: $${currentPrice / 100}\n`)
      message.push(`<b>Lowest price</b>: $${listingLowestPrice / 100}\n`)
      message.push(`<b>Estimated profit</b>: ${estimatedProfit.toFixed(2)}%`)

      await sendMessage(message.join(''), undefined, process.env.TELEGRAM_REPORT_ID)
    }

    CASHED_LISTINGS.add(data.id)
  }

  await sleep(25_000)

  init()
}

init()
