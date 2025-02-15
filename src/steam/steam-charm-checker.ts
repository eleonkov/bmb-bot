import dotenv from 'dotenv'

dotenv.config()

import { format } from 'date-fns'
import { sendMessage } from '../api/telegram'
import { getSteamUrl, sleep } from '../utils'

import { MapSteamMarketRenderResponse } from '../types'
import { getVercelMarketRender } from '../api/versel'

const CASHED_LISTINGS = new Set<string>()

const isSweetDieCastAK = (pattern: number) => {
  if (
    (pattern >= 1 && pattern <= 5000) ||
    (pattern > 5000 && pattern <= 9000) ||
    (pattern >= 20000 && pattern <= 23000) ||
    (pattern > 23000 && pattern <= 25000) ||
    (pattern >= 90000 && pattern <= 94999) ||
    (pattern >= 95000 && pattern <= 98999) ||
    (pattern >= 99000 && pattern <= 99999)
  ) {
    return true
  }

  return false
}

const configList = [
  {
    market_hash_name: 'Charm | Die-cast AK',
    isSweet: isSweetDieCastAK,
    start: 0,
  },
  {
    market_hash_name: "Charm | That's Bananas",
    isSweet: (pattern: number) => {
      if (pattern >= 98000 || pattern <= 2000) {
        return true
      }

      return false
    },
    start: 0,
  },
  {
    market_hash_name: 'Charm | Die-cast AK',
    isSweet: isSweetDieCastAK,
    start: 0,
  },
  {
    market_hash_name: 'Charm | POP Art',
    isSweet: (pattern: number) => {
      if (pattern >= 98000 || pattern <= 2000) {
        return true
      }

      return false
    },
    start: 0,
  },
]

const init = async () => {
  do {
    for (const [index, config] of configList.entries()) {
      const market_hash_name = config.market_hash_name

      try {
        const steamMarketResponse: MapSteamMarketRenderResponse[] = await getVercelMarketRender({
          market_hash_name,
          proxy: `${process.env.STEAM_PROXY}${index + 1}`,
          start: config.start,
          count: 100,
        })

        if (steamMarketResponse.length === 0) {
          throw new Error('No items found')
        }

        for (const [index, item] of steamMarketResponse.entries()) {
          if (!item.pattern || CASHED_LISTINGS.has(item.listingId)) continue

          const now = format(new Date(), 'HH:mm:ss')
          console.log(now, market_hash_name, item.pattern, item.price, config.start + index + 1)

          if (config.isSweet(item.pattern)) {
            const message: string[] = []
            message.push(
              `<a href="${getSteamUrl(market_hash_name, [])}">${market_hash_name}</a> | #${config.start + index + 1}\n\n`
            )
            message.push(`<b>Steam price</b>: $${item.price ? item.price : 'Sold!'}\n`)
            message.push(`<b>Charm template</b>: #${item.pattern}\n`)
            await sendMessage(message.join(''))
          }

          CASHED_LISTINGS.add(item.listingId)
        }
      } catch (error) {
        console.log(format(new Date(), 'HH:mm:ss'), 'ERROR', error.message)
      } finally {
        await sleep(40_000 / configList.length)
      }
    }
    // eslint-disable-next-line no-constant-condition
  } while (true)
}

init()
