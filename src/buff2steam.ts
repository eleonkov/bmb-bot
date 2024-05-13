import { getMarketGoods } from './api/buff'
import { getMarketPriceOverview } from './api/steam'
import { purchaseGoodsById } from './core'
import { MarketPriceOverview } from './types'
import { calculateROI, canMakePurchase, sleep } from './utils'

const MARKET_CACHE: Record<string, MarketPriceOverview> = {}

export const buff2steam = async ({
  pagesToLoad,
  params,
  autoApproval,
  logger,
}: {
  pagesToLoad: number
  params: Record<string, string | number>
  autoApproval: boolean
  logger: (data: { message: string; error?: boolean }) => void
}) => {
  let currentPage = 1
  let hasNextPage = pagesToLoad > 1

  do {
    const marketGoods = await getMarketGoods({ ...params, page_num: currentPage })

    if (marketGoods?.code === 'Internal Server Timeout') {
      await logger({ message: marketGoods.code })

      break
    }

    if (hasNextPage) {
      hasNextPage = currentPage < pagesToLoad
    }

    for (const {
      id,
      sell_min_price,
      market_hash_name,
      goods_info: { steam_price },
    } of marketGoods.data.items) {
      const sellMaxPrice = +steam_price
      const sellMinPrice = +sell_min_price

      const purchaseConfig = { goodsId: id, sellMinPrice: sell_min_price, marketHashName: market_hash_name, logger }

      // Purchase "Spectrum Case" if the price is equal or less then 1.8
      if (purchaseConfig.goodsId === 44 && +purchaseConfig.sellMinPrice <= 1.8) {
        await purchaseGoodsById(purchaseConfig)

        continue
      }

      // Purchase "Revolution Case" if the price is equal or less then 0.2
      if (purchaseConfig.goodsId === 24314 && +purchaseConfig.sellMinPrice <= 0.2) {
        await purchaseGoodsById(purchaseConfig)

        continue
      }

      // Purchase "Recoil Case" if the price is equal or less then 0.1
      if (purchaseConfig.goodsId === 23076 && +purchaseConfig.sellMinPrice <= 0.1) {
        await purchaseGoodsById(purchaseConfig)

        continue
      }

      // Purchase "Dreams & Nightmares Case" if the price is equal or less then 0.62
      if (purchaseConfig.goodsId === 21831 && +purchaseConfig.sellMinPrice <= 0.62) {
        await purchaseGoodsById(purchaseConfig)

        continue
      }

      if (calculateROI(sellMaxPrice, sellMinPrice) < 50) continue

      const cache = MARKET_CACHE[market_hash_name]
      const marketOverview = cache ? cache : await getMarketPriceOverview({ market_hash_name })
      MARKET_CACHE[market_hash_name] = { ...marketOverview }

      console.log(market_hash_name, +sell_min_price)

      if (canMakePurchase({ marketOverview, sellMinPrice, minVolume: 50 })) {
        if (autoApproval) await purchaseGoodsById(purchaseConfig)
        else await logger({ message: `https://buff.market/market/goods/${id}` })
      }
    }

    if (hasNextPage) {
      await sleep(11_555)
    }

    currentPage += 1
  } while (hasNextPage)
}

// buff2steam({
//   pagesToLoad: 20,
//   params: {
//     min_price: 1,
//     max_price: 4,
//     sort_by: 'sell_num.desc',
//     category_group: weaponGroups.join(','),
//   },
//   logger: ({ message, error }) => {
//     if (error) console.warn(message)
//     else console.log(message)
//   },
// })
