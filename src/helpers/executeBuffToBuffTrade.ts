import { differenceInDays } from 'date-fns'
import {
  getBriefAsset,
  getGoodsInfo,
  getGoodsSellOrder,
  getMarketGoodsBillOrder,
  getShopBillOrder,
  postCreateBargain,
  postGoodsBuy,
} from '../api/buff'
import { MarketGoodsItem, MessageType, Source } from '../types'
import { generateMessage, median } from '../utils'
import { BUFF_PURCHASE_THRESHOLD, GOODS_SALES_THRESHOLD, REFERENCE_DIFF_THRESHOLD } from '../config'
import { sendMessage } from '../api/telegram'
import { getTotalStickerPrice } from './getTotalStickerPrice'

export const executeBuffToBuffTrade = async (
  item: MarketGoodsItem,
  options: {
    source: Source
  }
) => {
  const goods_id = item.id
  const current_price = Number(item.sell_min_price)

  const history = await getMarketGoodsBillOrder({ goods_id })

  const salesLastWeek = history.data.items.filter(({ updated_at, type }) => {
    return differenceInDays(new Date(), new Date(updated_at * 1000)) <= 7 && type !== 2
  })

  if (salesLastWeek.length < GOODS_SALES_THRESHOLD) {
    return
  }

  const sales = salesLastWeek.map(({ price }) => Number(price))
  const median_price = median(sales.filter((price) => current_price * 2 > price))
  const estimated_profit = ((median_price * 0.975) / current_price - 1) * 100

  if (estimated_profit >= BUFF_PURCHASE_THRESHOLD - 5) {
    const goodsInfo = await getGoodsInfo({ goods_id })

    const goods_ref_price = Number(goodsInfo.data.goods_info.goods_ref_price)
    const refPriceDelta = (goods_ref_price / current_price - 1) * 100

    const orders = await getGoodsSellOrder({ goods_id, exclude_current_user: 1 })

    const lowestPricedItem = orders.data.items.find((el) => el.price === item.sell_min_price)

    if (!lowestPricedItem) {
      await sendMessage(
        `[${options.source}] Someone already bought the ${item.market_hash_name} item for $${current_price}.`
      )

      return
    }

    const positions = orders.data.items.filter(
      (el) => Number(el.price) > current_price && Number(el.price) < median_price
    )

    const payload = {
      id: goods_id,
      price: current_price,
      name: item.market_hash_name,
      referencePrice: goods_ref_price,
      estimatedProfit: estimated_profit,
      medianPrice: median_price,
      positions: positions.length,
      float: lowestPricedItem.asset_info.paintwear,
      source: options.source,
      createdAt: lowestPricedItem.created_at,
      updatedAt: lowestPricedItem.updated_at,
      userId: lowestPricedItem.user_id,
      refPriceDelta: refPriceDelta,
    }

    if (refPriceDelta >= REFERENCE_DIFF_THRESHOLD && estimated_profit >= BUFF_PURCHASE_THRESHOLD) {
      const {
        data: { cash_amount },
      } = await getBriefAsset()

      if (current_price > Number(cash_amount)) {
        await sendMessage(`[${options.source}] You don't have enough funds to buy ${item.market_hash_name} item.`)

        return
      }

      const response = await postGoodsBuy({ price: current_price, sell_order_id: lowestPricedItem.id })

      if (response.code !== 'OK') {
        await sendMessage(
          `[${options.source}] Failed to purchase the item ${item.market_hash_name}. Reason: ${response.code}`
        )

        return
      }

      await sendMessage(generateMessage({ type: MessageType.Purchased, ...payload }))
    } else {
      const stickerTotal = await getTotalStickerPrice(lowestPricedItem)
      const userSellingHistory = await getShopBillOrder({ user_id: lowestPricedItem.user_id })

      const isOk = userSellingHistory.code === 'OK'
      const userAcceptBargains = isOk ? !!userSellingHistory.data.items.find((item) => item.has_bargain) : false

      if (userAcceptBargains && current_price >= 15 && current_price < 20 && lowestPricedItem.allow_bargain) {
        const desired_price = Number((current_price - 2).toFixed(2))
        const lowest_bargain_price = Number(lowestPricedItem.lowest_bargain_price)

        const ref_price_delta = (goods_ref_price / desired_price - 1) * 100
        const estimated_profit = ((median_price * 0.975) / desired_price - 1) * 100

        if (ref_price_delta >= 10 && estimated_profit >= 10 && desired_price >= lowest_bargain_price) {
          const createBargain = await postCreateBargain({ sell_order_id: lowestPricedItem.id, price: desired_price })

          if (createBargain.code !== 'OK') {
            await sendMessage(`[${options.source}] Reason(create bargain): ${createBargain.code}.`)

            return
          }

          const bargain_payload = {
            ...payload,
            stickerTotal,
            userAcceptBargains,
            refPriceDelta: ref_price_delta,
            estimatedProfit: estimated_profit,
            bargainPrice: desired_price,
          }

          await sendMessage(generateMessage({ type: MessageType.Bargain, ...bargain_payload }))
        }
      } else {
        await sendMessage(generateMessage({ type: MessageType.Review, userAcceptBargains, stickerTotal, ...payload }))
      }
    }
  }
}
