import { differenceInDays } from 'date-fns'
import { getBriefAsset, getGoodsInfo, getGoodsSellOrder, getMarketGoodsBillOrder, postGoodsBuy } from '../api/buff'
import { MarketGoodsItem, MessageType, Source } from '../types'
import { generateMessage, median } from '../utils'
import { BUFF_PURCHASE_THRESHOLD, CURRENT_USER_ID, GOODS_SALES_THRESHOLD, REFERENCE_DIFF_THRESHOLD } from '../config'
import { sendMessage } from '../api/telegram'

export const executeBuffToBuffTrade = async (item: MarketGoodsItem) => {
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

  if (estimated_profit >= BUFF_PURCHASE_THRESHOLD) {
    const goodsInfo = await getGoodsInfo({ goods_id })

    const goods_ref_price = Number(goodsInfo.data.goods_info.goods_ref_price)
    const currentReferencePriceDiff = (goods_ref_price / current_price - 1) * 100

    const orders = await getGoodsSellOrder({ goods_id })

    const lowestPricedItem = orders.data.items.find((el) => el.price === item.sell_min_price)

    if (!lowestPricedItem) {
      await sendMessage(`[${Source.BUFF_BUFF}] Someone already bought the ${item.market_hash_name} item.`)

      return
    }

    // const float = Number(lowestPricedItem.asset_info.paintwear)
    const positions = orders.data.items.filter((el) => {
      return Number(el.price) > current_price && Number(el.price) < median_price
    })

    if (lowestPricedItem.user_id === CURRENT_USER_ID) {
      return
    }

    // if (lowestPricedItem.asset_info.paintwear) {
    //   if (
    //     (float > 0.12 && float < 0.15) ||
    //     (float > 0.3 && float < 0.38) ||
    //     (float > 0.41 && float < 0.45) ||
    //     float > 0.5
    //   ) {
    //     return
    //   }
    // }

    const payload = {
      id: goods_id,
      price: current_price,
      name: item.market_hash_name,
      referencePrice: goods_ref_price,
      estimatedProfit: estimated_profit,
      medianPrice: median_price,
      positions: positions.length,
      float: lowestPricedItem.asset_info.paintwear,
      source: Source.BUFF_DEFAULT,
    }

    if (currentReferencePriceDiff > REFERENCE_DIFF_THRESHOLD) {
      const {
        data: { cash_amount },
      } = await getBriefAsset()

      if (current_price > Number(cash_amount)) {
        await sendMessage(`[${Source.BUFF_BUFF}] You don't have enough funds to buy ${item.market_hash_name} item.`)

        return
      }

      const response = await postGoodsBuy({ price: current_price, sell_order_id: lowestPricedItem.id })

      if (response.code !== 'OK') {
        await sendMessage(
          `[${Source.BUFF_BUFF}] Failed to purchase the item ${item.market_hash_name}. Reason: ${response.code}`
        )

        return
      }

      await sendMessage(generateMessage({ type: MessageType.Purchased, ...payload }))
    }
  }
}
