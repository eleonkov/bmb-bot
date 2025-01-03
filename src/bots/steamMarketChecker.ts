import 'dotenv/config'

import { format } from 'date-fns'
import { getMarketRender } from '../api/steam'
import { sendMessage } from '../api/telegram'
import { extractStickers, generateSteamMessage, sleep } from '../utils'
import { getMarketGoods, getGoodsInfo } from '../api/buff'
import UserAgent from 'user-agents'
import { SteamDBItem, SteamMarketConfig } from '../types'
import Bottleneck from 'bottleneck'
import path from 'path'
import { readFileSync } from 'fs'

const CASHED_LISTINGS = new Set<string>()

const pathname = path.join(__dirname, '../../buff.json')
const steam_db: SteamDBItem = JSON.parse(readFileSync(pathname, 'utf8'))

console.log('Stickers in DB:', Object.keys(steam_db).length)

const CONFIG = [
  {
    market_hash_names: [
      'M4A1-S | Nitro (Factory New)',
      'AK-47 | Blue Laminate (Minimal Wear)',
      'M4A1-S | Basilisk (Minimal Wear)',
      'AK-47 | Ice Coaled (Factory New)',
    ],
    proxy: '',
  },
  {
    market_hash_names: [
      'M4A4 | Temukau (Field-Tested)',
      'Desert Eagle | Crimson Web (Field-Tested)',
      'M4A1-S | Blood Tiger (Minimal Wear)',
      'AK-47 | Cartel (Minimal Wear)',
    ],
    proxy: 'http://05b8879f:4809862d7f@192.144.10.226:30013',
  },
  {
    market_hash_names: [
      'AK-47 | Cartel (Field-Tested)',
      'AK-47 | Frontside Misty (Field-Tested)',
      'M4A4 | Bullet Rain (Minimal Wear)',
      'AK-47 | Red Laminate (Field-Tested)',
    ],
    proxy: 'http://44379168:8345796691@192.144.9.27:30013',
  },
  {
    market_hash_names: [
      'USP-S | Blueprint (Factory New)',
      'M4A1-S | Player Two (Field-Tested)',
      'AK-47 | Slate (Factory New)',
      'AK-47 | Slate (Minimal Wear)',
    ],
    proxy: 'http://jqhH85slcm:7NhQuTt8jm@78.153.143.128:11869', // ru
  },
  {
    market_hash_names: [
      'AK-47 | Rat Rod (Minimal Wear)',
      'M4A1-S | Basilisk (Field-Tested)',
      'AK-47 | Legion of Anubis (Field-Tested)',
      'AWP | POP AWP (Minimal Wear)',
    ],
    proxy: 'http://O40vIdkJYS:egrVx2iLvB@194.67.204.16:17206', // ru
  },
  {
    market_hash_names: [
      'AWP | Atheris (Minimal Wear)',
      'AK-47 | Phantom Disruptor (Minimal Wear)',
      'M4A4 | Neo-Noir (Field-Tested)',
      'Glock-18 | Water Elemental (Minimal Wear)',
    ],
    proxy: 'http://8cSG4Tgj0R:qjSxLU7hrg@81.176.239.24:23303', // ru
  },
  {
    market_hash_names: [
      'P90 | Asiimov (Field-Tested)',
      'Desert Eagle | Mecha Industries (Minimal Wear)',
      'AWP | Chromatic Aberration (Field-Tested)',
      'Desert Eagle | Conspiracy (Minimal Wear)',
    ],
    proxy: 'http://S0oH5AJkr2:hCdq69iwKV@185.156.75.160:15017', // ru
  },
  {
    market_hash_names: [
      'Desert Eagle | Heat Treated (Minimal Wear)',
      'M4A4 | 龍王 (Dragon King) (Field-Tested)',
      'M4A4 | 龍王 (Dragon King) (Minimal Wear)',
      'M4A4 | X-Ray (Minimal Wear)',
    ],
    proxy: 'http://TNJr9sjaxY:wJcQyV6T1o@185.156.75.126:13350', // new ru
  },
  {
    market_hash_names: [
      'AK-47 | Phantom Disruptor (Factory New)',
      'USP-S | The Traitor (Field-Tested)',
      'AWP | Chromatic Aberration (Minimal Wear)',
      'AWP | Atheris (Factory New)',
    ],
    proxy: 'http://L5B6t89Uef:EhqDzFUpJi@194.63.143.13:14362', // new ru
  },
  {
    market_hash_names: [
      'AWP | Fever Dream (Field-Tested)',
      'M4A4 | The Emperor (Field-Tested)',
      'M4A4 | Neo-Noir (Minimal Wear)',
      'M4A1-S | Decimator (Field-Tested)',
    ],
    proxy: 'http://zhDFociVpC:4cjHL08TwR@185.5.251.252:14016', // new ru
  },
  {
    market_hash_names: [
      'AK-47 | Blue Laminate (Factory New)',
      'M4A4 | Buzz Kill (Minimal Wear)',
      'M4A1-S | Basilisk (Factory New)',
      'Glock-18 | Water Elemental (Factory New)',
    ],
    proxy: 'http://v1NLVgpJBt:axmFWc47sd@185.5.250.21:13626', // new ru
  },
]

const limiter = new Bottleneck({ maxConcurrent: 4 })

const getStickerDetails = async (stickers: string[]) => {
  const details: Record<string, number> = {}

  try {
    for (const sticker of [...new Set(stickers)]) {
      const market_hash_name = `Sticker | ${sticker}`

      if (steam_db[market_hash_name]) {
        details[sticker] = Number(steam_db[market_hash_name].reference_price)
      } else {
        const goods = await getMarketGoods({ search: market_hash_name })
        const goods_id = goods.data.items.find((el) => el.market_hash_name === market_hash_name)?.id

        if (goods_id) {
          const goodsInfo = await getGoodsInfo({ goods_id })
          details[sticker] = Number(goodsInfo.data.goods_info.goods_ref_price)
          console.log('-', market_hash_name)
        }

        await sleep(1_000)
      }
    }

    return details
  } catch (error) {
    console.log('BUFF.MARKET', error.message)

    return {}
  }
}

const getInspectLink = (link: string, assetId: string, listingId: string): string => {
  return link.replace('%assetid%', assetId).replace('%listingid%', listingId)
}

const findSteamItemInfo = async (config: SteamMarketConfig, start: number = 0) => {
  try {
    const steam = await getMarketRender({
      proxy: config.proxy,
      userAgent: config.userAgent,
      market_hash_name: config.market_hash_name,
      start,
      count: 50,
    })

    for (const [index, listingId] of Object.keys(steam.listinginfo).entries()) {
      const position = start + index + 1

      const currentListing = steam.listinginfo[listingId]
      const price = Number(((currentListing.converted_price + currentListing.converted_fee) / 100).toFixed(2))

      const link = currentListing.asset.market_actions[0].link
      const inspectLink = getInspectLink(link, currentListing.asset.id, listingId)

      const assetInfo = steam.assets[730][currentListing.asset.contextid][currentListing.asset.id]
      const htmlDescription = assetInfo.descriptions.find((el) => el.value.includes('sticker_info'))?.value || ''

      const stickers = extractStickers(htmlDescription)

      if (CASHED_LISTINGS.has(inspectLink)) continue

      if (stickers.length !== 0 && config.canSendToTelegram) {
        const details = await getStickerDetails(stickers)

        const stickerTotalPrice = stickers.reduce((acc, name) => acc + (details[name] ?? 0), 0)

        console.log(
          format(new Date(), 'HH:mm:ss'),
          config.market_hash_name,
          `$${stickerTotalPrice.toFixed(2)}`,
          `#${position}`
        )

        if (price && stickerTotalPrice >= price) {
          await sendMessage(
            generateSteamMessage({
              price: price,
              name: config.market_hash_name,
              position,
              referencePrice: config.referencePrice,
              stickerTotal: stickerTotalPrice,
              inspectLink,
              stickers,
              details,
            })
          )
        }
      }

      CASHED_LISTINGS.add(inspectLink)
    }
  } catch (error) {
    console.log('STEAM_ERROR', config.proxy, error.message)
    await sleep(60_000 * 2)

    return
  }
}

;(async () => {
  const MARKET_HASH_NAMES: SteamMarketConfig[] = []

  for (const { proxy, market_hash_names } of CONFIG) {
    for (const market_hash_name of market_hash_names) {
      const canSendToTelegram = false
      const userAgent = new UserAgent().toString()

      const goods = await getMarketGoods({ search: market_hash_name })
      const goods_id = goods.data.items.find((el) => el.market_hash_name === market_hash_name)?.id

      if (goods_id) {
        const goodsInfo = await getGoodsInfo({ goods_id })
        const referencePrice = Number(goodsInfo.data.goods_info.goods_ref_price)

        console.log(market_hash_name, `$${referencePrice}`)

        MARKET_HASH_NAMES.push({ proxy, market_hash_name, canSendToTelegram, userAgent, referencePrice })
      }

      await sleep(5_000)
    }
  }

  console.log('Items to observe:', MARKET_HASH_NAMES.length)

  do {
    await Promise.all(
      MARKET_HASH_NAMES.map((config) => {
        return limiter.schedule(() => findSteamItemInfo(config))
      })
    )

    MARKET_HASH_NAMES.forEach((_, index) => {
      MARKET_HASH_NAMES[index].canSendToTelegram = true
    })

    await sleep(20_000)

    // eslint-disable-next-line no-constant-condition
  } while (true)
})()
