import 'dotenv/config'

import { getMarketPage } from '../api/steam'
import { CurrencyRates, Nullable, SteamMarketAssets, SteamMarketListingInfo } from '../types'
import { extractStickers, generateSteamMessage, sleep } from '../utils'
import { MarketHashNameState, ProxyState, SteamDBItem } from '../types'
import UserAgent from 'user-agents'
import { readFileSync } from 'fs'
import { getLatestCurrencyRates } from '../api/currencyfreaks'
import path from 'path'
import { calculateTotalCost, getInspectLink, getStickerDetails } from './utils'
import { format } from 'date-fns'
import { CURRENCY_MAPPING } from './config'
import { sendMessage } from '../api/telegram'

const CASHED_LISTINGS = new Set<string>()

let currencyRates: CurrencyRates['rates'] = {}

const goods: SteamDBItem = JSON.parse(readFileSync(path.join(__dirname, './goods.json'), 'utf8'))
const proxy: string = readFileSync(path.join(__dirname, '../../proxy.txt'), 'utf8')
const proxyList: string[] = proxy.split('\n').filter((p) => !!p.trim())

export const REQUEST_TIMEOUT = 2_500
export const LINK_INTERVAL = 60_000
export const PROXY_INTERVAL = 20_000
export const PROXY_BAN_TIME = 60_000 * 10

const assetsRegex = /var g_rgAssets = ({.*?});/
const listingInfoRegex = /var g_rgListingInfo = ({.*?});/

export const proxyState: ProxyState[] = proxyList.map((proxy) => ({
  proxy,
  active: true,
  lastUsed: 0,
  bannedUntil: 0,
  userAgent: new UserAgent({ deviceCategory: 'desktop' }).toString(),
  isBusy: false,
}))

export const marketHashNameState: MarketHashNameState[] = Object.keys(goods).map((name) => ({
  name,
  lastRequested: 0,
  steamDataFetched: false,
  referencePrice: Number(goods[name].reference_price),
  isInProgress: false,
}))

const getNextProxy = (): string | null => {
  const now = Date.now()

  for (const proxyData of proxyState) {
    if (
      proxyData.active &&
      !proxyData.isBusy &&
      now >= proxyData.bannedUntil &&
      now - proxyData.lastUsed >= PROXY_INTERVAL
    ) {
      proxyData.lastUsed = now
      return proxyData.proxy
    }

    if (!proxyData.active && now >= proxyData.bannedUntil) {
      proxyData.active = true
      proxyData.bannedUntil = 0
    }
  }

  return null
}

const fetchSteamMarketItem = async (config: { market_hash_name: string; proxy: string }) => {
  const proxyData = proxyState.find((item) => item.proxy === config.proxy)
  const marketHashNameData = marketHashNameState.find((item) => item.name === config.market_hash_name)

  if (proxyData) proxyData.isBusy = true
  if (marketHashNameData) marketHashNameData.isInProgress = true

  try {
    const html = await getMarketPage({
      market_hash_name: config.market_hash_name,
      proxy: config.proxy,
    })

    if (proxyData) proxyData.lastUsed = Date.now()

    const match1 = html.match(assetsRegex)
    const assets: Nullable<SteamMarketAssets> = match1?.[1] ? JSON.parse(match1[1]) : null

    const match2 = html.match(listingInfoRegex)
    const listingInfo: Nullable<SteamMarketListingInfo> = match2?.[1] ? JSON.parse(match2[1]) : null

    if (!assets || !listingInfo) {
      throw new Error('LISTING_INFO_NOT_FOUND')
    }

    for (const [index, id] of Object.keys(listingInfo).entries()) {
      const currentListingInfo = listingInfo[id]
      const currentAsset = assets[730][2][currentListingInfo.asset.id]

      const assetId = currentListingInfo.asset.id
      const listingId = currentListingInfo.listingid

      const referenceId = listingId + assetId

      const currencyId = currentListingInfo.currencyid
      const currencyCode = CURRENCY_MAPPING[currencyId]

      const link = currentListingInfo.asset.market_actions[0].link
      const inspectLink = getInspectLink(link, assetId, listingId)

      if (!currencyCode) {
        CASHED_LISTINGS.add(referenceId)
        throw new Error(`CURRENCY_CODE_NOT_FOUND: ${currencyId}`)
      }

      const price = Number(currentListingInfo.price + currentListingInfo.fee) / 100
      const convertedPrice = Number((price / Number(currencyRates[currencyCode])).toFixed(2))

      if (!CASHED_LISTINGS.has(referenceId)) CASHED_LISTINGS.add(referenceId)
      else continue

      const htmlDescription = currentAsset.descriptions.find((el) => el.value.includes('sticker_info'))?.value || ''

      const stickers = extractStickers(htmlDescription)

      if (convertedPrice && stickers.length !== 0 && marketHashNameData?.steamDataFetched) {
        const details = await getStickerDetails(stickers)
        const totalCost = calculateTotalCost(stickers, details)

        const referencePrice = marketHashNameData.referencePrice

        const estimatedProfit = ((referencePrice + totalCost - convertedPrice) / convertedPrice) * 100
        const stickerTotal = stickers.reduce((acc, name) => acc + (details[name] ?? 0), 0)

        console.log(format(new Date(), 'HH:mm:ss'), config.market_hash_name, `${estimatedProfit.toFixed(2)}%`)

        if (estimatedProfit >= 0) {
          await sendMessage(
            generateSteamMessage({
              price: convertedPrice,
              name: config.market_hash_name,
              position: index + 1,
              referencePrice: referencePrice,
              stickerTotal,
              estimatedProfit,
              inspectLink,
              stickers,
              details,
            })
          )
        }
      }
    }

    if (marketHashNameData) marketHashNameData.steamDataFetched = true
    if (marketHashNameData) marketHashNameData.lastRequested = Date.now()
  } catch (error) {
    console.log(format(new Date(), 'HH:mm:ss'), config.proxy, error.message)

    if (proxyData && error.message.includes('429')) {
      proxyData.active = false
      proxyData.bannedUntil = Date.now() + PROXY_BAN_TIME
    }

    if (proxyData) proxyData.lastUsed = Date.now()
  } finally {
    if (proxyData) proxyData.isBusy = false
    if (marketHashNameData) marketHashNameData.isInProgress = false
  }
}

async function init(): Promise<void> {
  const rates = await getLatestCurrencyRates()

  currencyRates = { ...rates.rates }

  console.log('Goods:', marketHashNameState.length)
  console.log('Proxies:', proxyState.length, '\n')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const now = Date.now()

    for (const linkData of marketHashNameState) {
      const timeSinceLastRequest = now - linkData.lastRequested

      if (timeSinceLastRequest >= LINK_INTERVAL && !linkData.isInProgress) {
        const proxy = getNextProxy()

        if (proxy) {
          fetchSteamMarketItem({ market_hash_name: linkData.name, proxy })
        }
      }
    }

    await sleep(REQUEST_TIMEOUT)
  }
}

init()
