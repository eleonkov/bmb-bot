import 'dotenv/config'

import {
  getBuyOrderHistory,
  getGoodsSellOrder,
  getItemsOnSale,
  getMarketBatchFee,
  postSellOrderChange,
} from '../api/buff'
import { sleep } from '../utils'
import { CURRENT_USER_ID } from '../config'
import { BuyOrderHistoryItem, SellOrderItem } from '../types'
import { sendMessage } from '../api/telegram'

const msgCache = new Set<string>()
const buyOrderHistoryList: BuyOrderHistoryItem[] = []

const getEstimatedProfit = (next_price: number | string, prev_price: number | string) => {
  return Number(((Number(next_price) / Number(prev_price) - 1) * 100).toFixed(2))
}

const buffSelling = async () => {
  const message: string[] = []
  const pages = Array.from({ length: 2 }, (_, i) => i + 1)

  const sellingSet = new Set<number>()

  for (const page_num of pages) {
    const response = await getItemsOnSale({ page_num })
    for (const item of response.data.items) sellingSet.add(item.goods_id)
    await sleep(5_000)
  }

  for (const goods_id of sellingSet) {
    const response = await getGoodsSellOrder({ goods_id })

    const current_index = response.data.items.findIndex(({ user_id }) => user_id === CURRENT_USER_ID)

    if (current_index === -1 || !response.data.items[current_index + 1]) {
      continue
    }

    const item = response.data.items[current_index]

    const current_price = Number(item.price)
    const payload: SellOrderItem = { sell_order_id: item.id, price: current_price, desc: '', income: 0 }
    const next_user = response.data.items[current_index + 1].user_id
    const market_hash_name = response.data.goods_infos[goods_id].market_hash_name
    const paintwear = item.asset_info.paintwear

    const buffLink = `<a href="https://buff.market/market/goods/${goods_id}">${market_hash_name}</a>`

    const totalCosmeticValue = item.asset_info.info.stickers.reduce((acc, cur) => {
      return acc + Number(cur.sell_reference_price)
    }, 0)

    const buyOrderHistoryItem = buyOrderHistoryList.find((item) => {
      return paintwear && item.asset_info.paintwear === paintwear && item.goods_id === goods_id
    })

    if (current_index === 0) {
      const next_price = Number(response.data.items[current_index + 1].price)

      if (current_price === next_price && next_user !== CURRENT_USER_ID) {
        payload.price = Number((current_price - 0.01).toFixed(2))
      } else if (buyOrderHistoryItem && Number((next_price - current_price).toFixed(2)) > 0.01) {
        payload.price = Number((next_price - 0.01).toFixed(2))
      } else if (!buyOrderHistoryItem && Number((next_price - current_price).toFixed(2)) > 0.01) {
        const msg = `${buffLink} +$${(next_price - current_price).toFixed(2)}`

        if (!msgCache.has(msg)) {
          message.push(msg)
          msgCache.add(msg)
        }
      }
    }

    if (current_index > 0) {
      const prev_price = Number(response.data.items[current_index - 1].price)

      // TODO add check for good float
      if (buyOrderHistoryItem && totalCosmeticValue <= 1) {
        const estimatedProfit = getEstimatedProfit(prev_price - 0.01, buyOrderHistoryItem.price)
        console.log(market_hash_name, estimatedProfit)
        if (estimatedProfit >= 5) payload.price = Number((prev_price - 0.01).toFixed(2))
      } else if (Number((current_price - prev_price).toFixed(2)) === 0.01 || prev_price === current_price) {
        payload.price = Number((prev_price - 0.01).toFixed(2))
      }
    }

    if (payload.price !== current_price) {
      const fee = await getMarketBatchFee({ goods_ids: String(goods_id), prices: payload.price + '' })
      payload.income = Number((Number(payload.price) - Number(fee.data.total_fee)).toFixed(2))
      await postSellOrderChange({ sell_orders: [payload] })
      message.push(`${buffLink} $${current_price} -> $${payload.price}`)
    }

    await sleep(10_000)
  }

  if (message.length !== 0) {
    await sendMessage('<b>SELLING REPORT</b>\n\n' + message.map((msg, index) => `${index + 1}. ${msg}`).join('\n'))
  }

  await sleep(60_000 * 10)

  buffSelling()
}

;(async () => {
  const pages = Array.from({ length: 15 }, (_, i) => i + 1)

  for (const page_num of pages) {
    const history = await getBuyOrderHistory({ page_num })
    for (const item of history.data.items) buyOrderHistoryList.push(item)
    await sleep(5_000)
  }

  buffSelling()
})()
