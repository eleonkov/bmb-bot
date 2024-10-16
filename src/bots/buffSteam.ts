import 'dotenv/config'

import { getMarketGoods } from '../api/buff'
import { isLessThanThreshold, sleep } from '../utils'
import { format } from 'date-fns'
import { sendMessage } from '../api/telegram'
import { Source } from '../types'
import { executeBuffToSteamTrade } from '../helpers/executeBuffToSteamTrade'

export const GOODS_CACHE: Record<number, { price: number }> = {}

const buffSteam = async () => {
  const pages = Array.from({ length: 15 }, (_, i) => i + 1)

  try {
    for (const page_num of pages) {
      const marketGoods = await getMarketGoods({ page_num, sort_by: 'sell_num.desc', min_price: 2, max_price: 15 })

      for (const item of marketGoods.data.items) {
        const now = format(new Date(), 'HH:mm:ss')
        const current_price = Number(item.sell_min_price)

        if (item.id in GOODS_CACHE && isLessThanThreshold(GOODS_CACHE[item.id].price, current_price, 0.1)) {
          GOODS_CACHE[item.id].price = current_price

          continue
        }

        if (item.id in GOODS_CACHE) {
          console.log(`${now}: ${item.market_hash_name} $${GOODS_CACHE[item.id].price} -> $${current_price}`)
        }

        if (item.id in GOODS_CACHE && GOODS_CACHE[item.id].price > current_price) {
          await executeBuffToSteamTrade(item, { source: Source.BUFF_STEAM })
        }

        GOODS_CACHE[item.id] = { price: current_price }
      }

      await sleep(2_500)
    }
  } catch (error) {
    console.log('Something went wrong', error)

    await sendMessage(error?.message ?? 'Something went wrong.')

    return
  }

  buffSteam()
}

buffSteam()