import 'dotenv/config'

import { format } from 'date-fns'
import Bottleneck from 'bottleneck'
import { getMarketRender, getSearchMarketRender } from '../api/steam'
import { sendMessage } from '../api/telegram'
import { generateSteamMessage, sleep } from '../utils'
import { getIPInspectItemInfo } from '../api/pricempire'
// import { getBuff163MarketGoods } from '../api/buff163'
import { getGoodsInfo, getMarketGoods } from '../api/buff'

const CASHED_LISTINGS = new Set<string>()
const STICKER_PRICES = new Map<string, number>()
const SEARCH_MARKET_DATA: Record<string, { price: number; quantity: number }> = {}

const limiter = new Bottleneck({ maxConcurrent: 1 })

const MARKET_CONFIG = [
  {
    query: 'Sticker',
    start: 540,
    count: 100,
    type: 'any',
  },
  {
    query: 'Sticker',
    start: 640,
    count: 100,
    type: 'any',
  },
  {
    query: 'Sticker',
    start: 740,
    count: 100,
    type: 'any',
  },
  {
    query: 'Sticker',
    start: 840,
    count: 100,
    type: 'any',
  },
  {
    query: 'Sticker',
    start: 940,
    count: 100,
    type: 'any',
  },
]

const getInspectLink = (link: string, assetId: string, listingId: string): string => {
  return link.replace('%assetid%', assetId).replace('%listingid%', listingId)
}

const findSteamItemInfo = async (config: { query: string; start: number; count: number; type: string }) => {
  const now = format(new Date(), 'HH:mm:ss')

  try {
    const searchResult = await getSearchMarketRender({ ...config })

    for (const result of searchResult.results) {
      const quantity = result.sell_listings
      const price = Number((result.sell_price / 100).toFixed(2))
      const market_hash_name = result.asset_description.market_hash_name
      const referenceId = `${config.query} ${config.type} ${market_hash_name}`

      if (referenceId in SEARCH_MARKET_DATA && SEARCH_MARKET_DATA[referenceId].quantity === quantity) {
        continue
      }

      if (referenceId in SEARCH_MARKET_DATA) {
        console.log(`${now}: ${market_hash_name} ${SEARCH_MARKET_DATA[referenceId].quantity} -> ${quantity}`)
      }

      if (referenceId in SEARCH_MARKET_DATA && SEARCH_MARKET_DATA[referenceId].quantity < quantity) {
        try {
          const steam = await getMarketRender({
            market_hash_name,
            filter: config.query,
            start: 0,
            count: quantity >= 50 ? 20 : 10,
          })

          for (const [index, listingId] of Object.keys(steam.listinginfo).entries()) {
            if (CASHED_LISTINGS.has(listingId)) continue

            const currentListing = steam.listinginfo[listingId]
            const link = currentListing.asset.market_actions[0].link

            const price = Number(((currentListing.converted_price + currentListing.converted_fee) / 100).toFixed(2))
            const inspectLink = getInspectLink(link, currentListing.asset.id, listingId)

            CASHED_LISTINGS.add(listingId)

            try {
              const response = await getIPInspectItemInfo({ url: inspectLink })
              await sleep(1_000)

              const stickerTotalPrice = (response.iteminfo?.stickers || []).reduce(
                (acc, { wear, name }) => (wear === null ? acc + (STICKER_PRICES.get(`Sticker | ${name}`) ?? 0) : acc),
                0
              )

              console.log(`|___ ${listingId} $${stickerTotalPrice.toFixed(2)}`)

              if (stickerTotalPrice < 20) {
                continue
              }

              const goods = await getMarketGoods({ search: market_hash_name })
              const goods_id = goods.data.items.find((el) => el.market_hash_name === market_hash_name)?.id

              if (!goods_id) {
                console.log(now, 'BUFF_GOODS_ID_ERROR')

                continue
              }

              const goodsInfo = await getGoodsInfo({ goods_id })
              const referencePrice = Number(goodsInfo.data.goods_info.goods_ref_price)

              if (referencePrice + stickerTotalPrice * 0.11 < price) {
                continue
              }

              await sendMessage(
                generateSteamMessage({
                  id: goods_id,
                  price: price,
                  name: market_hash_name,
                  float: response.iteminfo.floatvalue,
                  stickers: response.iteminfo?.stickers || [],
                  stickerTotal: stickerTotalPrice,
                  referencePrice: referencePrice,
                  position: index + 1,
                  filter: config.query,
                })
              )
            } catch (error) {
              console.log(now, error.message)
            }
          }
        } catch (error) {
          console.log(now, 'STEAM_MARKET_PAGE_ERROR')
        }
      }

      SEARCH_MARKET_DATA[referenceId] = { price, quantity }
    }
  } catch (error) {
    console.log(now, 'STEAM_MARKET_SEARCH_ERROR')
  }
}

;(async () => {
  const pages = Array.from({ length: 110 }, (_, i) => i + 1)

  // for (const page_num of pages) {
  //   const goods = await getBuff163MarketGoods({
  //     page_num,
  //     category_group: 'sticker',
  //     sort_by: 'price.desc',
  //   })
  //   for (const item of goods.data.items) {
  //     const market_hash_name = item.market_hash_name
  //     const price = Number((Number(item.sell_min_price) * 0.138).toFixed(2))
  //     console.log(page_num, market_hash_name, price, item.sell_num)
  //     STICKER_PRICES.set(market_hash_name, price)
  //   }
  //   if (goods.data.items.length !== 50) break
  //   await sleep(4_000)
  // }

  do {
    await Promise.allSettled(MARKET_CONFIG.map((config) => limiter.schedule(() => findSteamItemInfo(config))))

    await sleep(10_000) // Sleep 10s between requests

    // eslint-disable-next-line no-constant-condition
  } while (true)
})()
