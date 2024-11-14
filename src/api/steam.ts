import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

import { SteamMarketPriceHistory, SteamMarketPriceOverview, SteamMarketRender } from '../types'

const instance = axios.create({
  baseURL: 'https://steamcommunity.com',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
})

const http = setupCache(instance)

export const getMarketPriceOverview = async ({
  appid = 730,
  country = 'BY',
  currency = 1,
  market_hash_name,
}: {
  appid?: number
  country?: string
  currency?: number
  market_hash_name: string
}): Promise<SteamMarketPriceOverview> => {
  const { data } = await http.get<SteamMarketPriceOverview>('/market/priceoverview/', {
    params: { appid, country, currency, market_hash_name },
    cache: {
      ttl: 1000 * 60 * 60, // 1 hour
    },
  })

  return data
}

export const getPriceHistory = async ({
  appid = 730,
  country = 'BY',
  currency = 1,
  market_hash_name,
}: {
  appid?: number
  country?: string
  currency?: number
  market_hash_name: string
}): Promise<SteamMarketPriceHistory> => {
  const { data } = await http.get<SteamMarketPriceHistory>('/market/pricehistory/', {
    params: { appid, country, currency, market_hash_name },
    headers: {
      Cookie: `steamLoginSecure=${process.env.STEAM_LOGIN_SECURE}`,
    },
    cache: {
      ttl: 1000 * 60 * 60, // 1 hour
    },
  })

  return data
}

export const getMarketRender = async ({
  appid = 730,
  country = 'BY',
  currency = 1,
  market_hash_name,
  start = 0,
  count = 10,
  language = 'english',
}: {
  appid?: number
  country?: string
  currency?: number
  market_hash_name: string
  start?: number
  count?: number
  language?: 'english'
}): Promise<SteamMarketRender> => {
  const { data } = await http.get(`/market/listings/${appid}/${encodeURIComponent(market_hash_name)}/render/`, {
    params: { appid, country, currency, start, count, language },
    headers: {
      'content-type': 'application/json',
    },
    cache: false,
  })

  return data
}
