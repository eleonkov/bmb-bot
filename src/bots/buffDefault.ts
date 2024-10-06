import 'dotenv/config'

import { format } from 'date-fns'
import { getMarketGoods } from '../api/buff'
import { sleep } from '../utils'
import { sendMessage } from '../api/telegram'
import { executeBuffToBuffTrade } from '../helpers/executeBuffToBuffTrade'
import { Source } from '../types'
import { executeBuffToBuffKatowiceTrade } from '../helpers/executeBuffToBuffKatowiceTrade'
import { executeBuffToBuffBargain } from '../helpers/executeBuffToBuffBargain'
import { BARGAIN_MIN_PRICE } from '../config'

const GOODS_CACHE: Record<number, { sell_num: number }> = {}

const buffDefault = async () => {
  const now = format(new Date(), 'HH:mm:ss')

  try {
    const marketGoods = await getMarketGoods({})

    const items = marketGoods.data.items.slice(0, 5)

    for (const item of items) {
      if (item.id in GOODS_CACHE && GOODS_CACHE[item.id].sell_num !== item.sell_num) {
        console.log(`${now}: ${item.market_hash_name} ${GOODS_CACHE[item.id].sell_num} -> ${item.sell_num}`)

        if (GOODS_CACHE[item.id].sell_num < item.sell_num && item.sell_num >= 10) {
          await executeBuffToBuffTrade(item, { source: Source.BUFF_DEFAULT })

          if (Number(item.sell_min_price) >= BARGAIN_MIN_PRICE) {
            await executeBuffToBuffBargain(item, { source: Source.BUFF_DEFAULT })
          }

          await sleep(2_000)
        }
      }

      GOODS_CACHE[item.id] = { sell_num: item.sell_num }
    }

    await executeBuffToBuffKatowiceTrade()
  } catch (error) {
    console.log('Something went wrong', error)

    await sendMessage(error?.message ?? 'Something went wrong.')

    return
  }

  await sleep(10_000)

  buffDefault()
}

;(async () => {
  const pages = Array.from({ length: 20 }, (_, i) => i + 1)

  for (const page_num of pages) {
    const goods = await getMarketGoods({ page_num, sort_by: 'sell_num.desc' })

    for (const item of goods.data.items) {
      GOODS_CACHE[item.id] = { sell_num: item.sell_num }
    }

    await sleep(5_000)
  }

  buffDefault()
})()
