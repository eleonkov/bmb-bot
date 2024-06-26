import axios from 'axios'
import { parse } from 'set-cookie-parser'

import {
  BriefAsset,
  GoodsBuyResponse,
  GoodsSellOrder,
  MarketGoods,
  MarketGoodsBillOrder,
  MarketPriceHistory,
  TopBookmarked,
} from '../types'

export const defaultCookies: Record<string, string> = {
  'Locale-Supported': 'en',
  'Device-Id': process.env.DEVICE_ID as string,
  session: process.env.SESSION_TOKEN as string,
  remember_me: process.env.REMEMBER_ME as string,
  csrf_token: process.env.CSRF_TOKEN as string,
  forterToken: process.env.FORTER_TOKEN as string,
}

const http = axios.create({
  baseURL: 'https://api.buff.market/api',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
})

const getCookies = (cookies: Record<string, string>) => {
  const cookieList = Object.keys(cookies).map((k) => `${k}=${cookies[k]};`)

  return cookieList.join(' ')
}

http.interceptors.request.use(
  (config) => {
    config.headers['Cookie'] = getCookies(defaultCookies)
    config.headers['X-Csrftoken'] = defaultCookies['csrf_token']

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

http.interceptors.response.use(
  (response) => {
    const setCookieHeader = response.headers['set-cookie']

    if (setCookieHeader) {
      const data = parse(setCookieHeader, { map: true })

      const session = 'session'
      const csrf_token = 'csrf_token'

      if (data[csrf_token] && defaultCookies[csrf_token]) {
        defaultCookies[csrf_token] = data[csrf_token].value
      }

      if (data[session] && defaultCookies[session]) {
        defaultCookies[session] = data[session].value
      }
    }

    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const getMarketGoods = async ({
  game = 'csgo',
  search,
  page_num = 1,
  page_size = 50,
  category,
  itemset,
  min_price = 5,
  max_price = 100,
  category_group,
  quality = 'normal',
  series,
  exterior,
  sort_by = 'sell_num.desc',
}: {
  game?: string
  search?: string
  page_num?: number
  page_size?: number
  quality?: string
  category?: string
  itemset?: string
  min_price?: number
  max_price?: number
  series?: string
  category_group?: string
  exterior?: string
  sort_by?: string
}): Promise<MarketGoods> => {
  const { data } = await http.get('/market/goods', {
    params: {
      game,
      search,
      page_num,
      page_size,
      category,
      itemset,
      min_price,
      max_price,
      quality,
      category_group,
      series,
      exterior,
      sort_by,
    },
  })

  return data
}

export const getGoodsSellOrder = async ({
  game = 'csgo',
  page_num = 1,
  goods_id,
  sort_by = 'default',
  exclude_current_user = 1,
  max_price,
}: {
  game?: string
  page_num?: number
  goods_id: number
  sort_by?: string
  max_price?: string
  exclude_current_user?: number
}): Promise<GoodsSellOrder> => {
  const { data } = await http.get('/market/goods/sell_order', {
    params: { game, page_num, goods_id, sort_by, exclude_current_user, max_price },
  })

  return data
}

export const getTopBookmarked = async ({
  game = 'csgo',
  page_num = 1,
  page_size = 50,
  category_group,
  min_price = 5,
  max_price = 40,
}: {
  game?: string
  page_num?: number
  page_size?: number
  category_group?: string
  min_price?: number
  max_price?: number
}): Promise<TopBookmarked> => {
  const { data } = await http.get('/market/sell_order/top_bookmarked', {
    params: { game, page_num, page_size, category_group, max_price, min_price },
  })

  return data
}

export const getBriefAsset = async (): Promise<BriefAsset> => {
  const { data } = await http.get('/asset/get_brief_asset')

  return data
}

export const getMarketGoodsBillOrder = async ({
  game = 'csgo',
  goods_id,
}: {
  game?: string
  goods_id: number
}): Promise<MarketGoodsBillOrder> => {
  const { data } = await http.get('/market/goods/bill_order', { params: { game, goods_id } })

  return data
}

export const getMarketPriceHistory = async ({
  game = 'csgo',
  goods_id,
  days = 7,
  buff_price_type = 1,
}: {
  game?: string
  goods_id: number
  buff_price_type?: number
  days?: number
}): Promise<MarketPriceHistory> => {
  const { data } = await http.get('market/goods/price_history/buff', {
    params: { game, goods_id, days, buff_price_type },
  })

  return data
}

export const postGoodsBuy = async ({
  game = 'csgo',
  pay_method = 12,
  ...rest
}: {
  game?: string
  pay_method?: number
  price: number
  sell_order_id: string
}): Promise<GoodsBuyResponse> => {
  const { data } = await http.post('/market/goods/buy', { game, pay_method, ...rest })

  return data
}
