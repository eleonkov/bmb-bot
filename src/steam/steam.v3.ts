import 'dotenv/config'

import { format } from 'date-fns'
import { getMarketRender, getSearchMarketRender, stemMarketBuyListing } from '../api/steam'
import { sendMessage } from '../api/telegram'
import { extractStickers, getSteamUrl, sleep } from '../utils'
import { getInspectLink, isStickerCombo } from './utils'

import { getCSFloatItemInfo, getCSFloatListings } from '../api/csfloat'
import { SearchMarketRender, SteamMarketRender } from '../types'
import { readFileSync } from 'fs'
import path from 'path'

const CASHED_LISTINGS = new Set<string>()
const GOODS_CACHE: Record<string, { price: number; listings: number }> = {}

const pathname = path.join(__dirname, '../../csfloat.json')
const stickerData: Record<string, number> = JSON.parse(readFileSync(pathname, 'utf8'))

const findSteamItemInfo = async ({ market_hash_name, proxy }: { market_hash_name: string; proxy: string }) => {
  let basePrice: number = 0

  try {
    const steam: SteamMarketRender = await getMarketRender({ market_hash_name, proxy, filter: 'Sticker' })

    for (const [index, listingId] of Object.keys(steam.listinginfo).entries()) {
      if (CASHED_LISTINGS.has(listingId)) continue

      const currentListing = steam.listinginfo[listingId]
      const price = Number(((currentListing.converted_price + currentListing.converted_fee) / 100).toFixed(2))

      const assetInfo = steam.assets[730][currentListing.asset.contextid][currentListing.asset.id]
      const htmlDescription = assetInfo.descriptions.find((el) => el.value.includes('sticker_info'))?.value || ''

      const link = currentListing.asset.market_actions[0].link
      const inspectLink = getInspectLink(link, currentListing.asset.id, listingId)

      const stickers = extractStickers(htmlDescription)

      const stickerTotal = stickers.reduce((acc, name) => acc + (stickerData[`Sticker | ${name}`] ?? 0), 0)

      console.log(format(new Date(), 'HH:mm:ss'), market_hash_name, stickerTotal.toFixed(2))

      if (stickerTotal > 15) {
        if (basePrice === 0) {
          try {
            await getCSFloatListings({ market_hash_name }).then((response) => {
              basePrice = response.data[0].reference.base_price / 100
            })
          } catch (error) {
            await sendMessage(`Failed to retrieve the price for the ${market_hash_name} item.`)
          }
        }

        const SP = ((price - basePrice) / stickerTotal) * 100

        console.log(format(new Date(), 'HH:mm:ss'), 'SP', SP.toFixed(2) + '%')

        if (SP < (isStickerCombo(stickers) ? 18 : 8)) {
          const itemInfoResponse = await getCSFloatItemInfo({ url: inspectLink })

          const message: string[] = []

          message.push(
            `<a href="${getSteamUrl(market_hash_name, stickers)}">${market_hash_name}</a> | #${index + 1}\n\n`
          )

          for (const sticker of itemInfoResponse.iteminfo?.stickers ?? []) {
            const name = `Sticker | ${sticker.name}`
            message.push(
              `<b>${name}</b>: ${sticker.wear === 0 ? '100%' : `${(sticker.wear * 100).toFixed(2)}% ($${stickerData[name] ?? 0})`}\n`
            )
          }
          message.push(`\n`)
          message.push(`<b>SP</b>: ${SP.toFixed(2)}%\n`)
          message.push(`<b>Steam price</b>: $${price}\n`)
          message.push(`<b>Reference price</b>: $${basePrice.toFixed(2)}\n`)
          message.push(`<b>Stickers total</b>: $${stickerTotal.toFixed(2)}\n\n`)
          message.push(`<b>Float</b>: ${itemInfoResponse.iteminfo.floatvalue}\n\n`)

          const sentMessage = await sendMessage(message.join(''))

          if (price && price <= 20 && (itemInfoResponse.iteminfo.stickers || [])?.every((item) => item.wear === 0)) {
            try {
              const response = await stemMarketBuyListing({
                idListing: currentListing.listingid,
                market_hash_name: market_hash_name,
                converted_price: currentListing.converted_price,
                converted_fee: currentListing.converted_fee,
              })

              if (response?.wallet_info?.success === 1) {
                await sendMessage('Success purchase', sentMessage.result.message_id)
              } else {
                await sendMessage('Failed purchase', sentMessage.result.message_id)
              }

              console.log(response)
            } catch (error) {
              console.log(error)
              await sendMessage(`Steam failed to purchase the ${market_hash_name} item.`)
            }
          }
        }

        await sleep(3_000)
      }

      CASHED_LISTINGS.add(listingId)
    }
  } catch (error) {
    console.log(format(new Date(), 'HH:mm:ss'), 'STEAM_ERROR', error.message)

    if (error.message?.includes('403')) {
      await sleep(60_000 * 2)
    }
  }
}

;(async () => {
  const STEAM_PROXY = String(process.env.STEAM_PROXY).trim()
  const STEAM_SEARCH_START = Number(process.env.STEAM_SEARCH_START)

  console.log('STEAM_PROXY', STEAM_PROXY)
  console.log('STEAM_SEARCH_START', STEAM_SEARCH_START)

  do {
    for (const start of [STEAM_SEARCH_START - 1, STEAM_SEARCH_START, STEAM_SEARCH_START + 1]) {
      try {
        const response: SearchMarketRender = await getSearchMarketRender({
          query: 'Sticker',
          quality: ['tag_strange', 'tag_normal'],
          proxy: STEAM_PROXY,
          start,
        })

        for (const item of response.results) {
          const market_hash_name = item.asset_description.market_hash_name

          if (market_hash_name in GOODS_CACHE && GOODS_CACHE[market_hash_name].listings !== item.sell_listings) {
            //
          }

          if (item.sell_listings < 100) {
            if (market_hash_name in GOODS_CACHE && GOODS_CACHE[market_hash_name].listings < item.sell_listings) {
              await findSteamItemInfo({ market_hash_name, proxy: STEAM_PROXY })
            }
          }

          GOODS_CACHE[market_hash_name] = { price: item.sell_price, listings: item.sell_listings }
        }
      } catch (error) {
        console.log(error.message)
      } finally {
        await sleep(61_000)
      }
    }

    // eslint-disable-next-line no-constant-condition
  } while (true)
})()
