import { getBriefAsset, getGoodsSellOrder, getMarketGoods, postGoodsBuy } from './api/buff'
import { getMarketPriceOverview } from './api/steam'
import { MarketPriceOverview } from './types'
import { calculateROI, canMakePurchase, sleep } from './utils'

const MARKET_CACHE: Record<string, MarketPriceOverview> = {}

export const buff2steam = async ({
  pagesToLoad,
  params,
  logger,
}: {
  pagesToLoad: number
  params: Record<string, string | number>
  logger: (data: { message: string; error?: boolean }) => void
}) => {
  let currentPage = 1
  let hasNextPage = pagesToLoad > 1

  do {
    const goods = await getMarketGoods({ ...params, page_num: currentPage })

    if (hasNextPage) {
      hasNextPage = currentPage < pagesToLoad
    }

    await sleep(3_000)

    for (const {
      id,
      sell_min_price,
      market_hash_name,
      goods_info: { steam_price },
    } of goods.data.items) {
      const sellMaxPrice = +steam_price
      const sellMinPrice = +sell_min_price

      const initialRoi = calculateROI(sellMaxPrice, sellMinPrice)

      if (initialRoi < 50) continue

      const cache = MARKET_CACHE[market_hash_name]
      const marketOverview = cache ?? (await getMarketPriceOverview({ market_hash_name }))

      if (!canMakePurchase({ marketOverview, sellMinPrice, minVolume: 50 })) {
        console.log(
          `Product ${market_hash_name} with initial ROI ${initialRoi.toFixed(2)}% and price ${sellMinPrice}$ has been skipped due to: ${JSON.stringify(marketOverview)}\n`
        )

        break
      }

      await logger({
        message: `Product ${market_hash_name} with initial ROI ${initialRoi.toFixed(2)}% and price ${sellMinPrice}$ has been bought. Market overview: ${JSON.stringify(marketOverview)}`,
      })

      // const {
      //   data: { total_amount },
      // } = await getBriefAsset()

      // let totalAmount = Number(total_amount) ?? 0

      // const goods = await getGoodsSellOrder({ goods_id: id, max_price: sell_min_price, exclude_current_user: 1 })

      // for (const filteredGood of goods.data.items) {
      // if (Number(filteredGood.price) > totalAmount) {
      //   await logger({ message: `No cash to buy "${market_hash_name}" for ${filteredGood.price}$`, error: true })

      //   break
      // }

      // await postGoodsBuy({ sell_order_id: filteredGood.id, price: Number(filteredGood.price) })
      // await logger({ message: `Item "${market_hash_name}" has been bought! ROI: ${initialRoi.toFixed(2)}` })
      // await sleep(3_000)

      // totalAmount -= Number(filteredGood.price)
      // }

      MARKET_CACHE[market_hash_name] = marketOverview

      await sleep(3_500)

      // await logger({ message: `Balance after transaction(s): ${totalAmount}$` })
    }

    if (hasNextPage) {
      await sleep(8_500)
    }

    currentPage += 1
  } while (hasNextPage)
}

// buff2steam({
//   pagesToLoad: 5,
//   params: {
//     min_price: 1,
//     max_price: 4,
//     sort_by: 'sell_num.desc',
//   },
//   logger: ({ message, error }) => {
//     if (error) console.warn(message)
//     else console.log(message)
//   },
// })
