import 'dotenv/config'

import { format } from 'date-fns'
import { getMarketGoods } from '../api/buff'
import { isLessThanThreshold, sleep } from '../utils'
import { sendMessage } from '../api/telegram'
import { executeBuffToBuffBargain } from '../helpers/executeBuffToBuffBargain'

export const GOODS_CACHE: Record<number, { price: number }> = {}

const buffDefault = async () => {
  const now = format(new Date(), 'HH:mm:ss')

  try {
    const marketGoods = await getMarketGoods({})

    const items = marketGoods.data.items.slice(0, 5)

    for (const item of items) {
      const goods_id = item.id
      const current_price = Number(item.sell_min_price)

      if (goods_id in GOODS_CACHE && isLessThanThreshold(GOODS_CACHE[goods_id].price, current_price, 0.1)) {
        GOODS_CACHE[goods_id].price = current_price

        continue
      }

      if (goods_id in GOODS_CACHE) {
        console.log(`${now}: ${item.market_hash_name} $${GOODS_CACHE[goods_id].price} -> $${current_price}`)

        if (GOODS_CACHE[goods_id].price > current_price) {
          await executeBuffToBuffBargain(item)
        }
      }

      GOODS_CACHE[goods_id] = { price: current_price }
    }
  } catch (error) {
    console.log('Something went wrong', error)

    await sendMessage(error?.message ?? 'Something went wrong.')

    return
  }

  await sleep(10_000)

  buffDefault()
}

buffDefault()
