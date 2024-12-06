export type GoodsSellOrderItem = {
  id: string
  appid: number
  goods_id: number
  price: string
  user_id: string
  allow_bargain: boolean
  lowest_bargain_price: string
  created_at: number
  updated_at: number

  asset_info: {
    classid: string
    assetid: string
    instanceid: string
    contextid: number
    paintwear: string
    info: {
      stickers: unknown[]
    }
  }
}

export type GoodsSellOrder = {
  data: {
    goods_infos: {
      [key: number]: {
        goods_id: number
        market_hash_name: string
        steam_price: string
      }
    }
    items: GoodsSellOrderItem[]
    user_infos: {
      [key: string]: {
        nickname: string
      }
    }
  }
  code: string
}

export type ShopBillOrderItem = {
  has_bargain: boolean
  original_price: string
  price: string
  goods_id: number
  asset_info: {
    paintwear: string
  }
}

export type ShopBillOrder = {
  data: {
    items: ShopBillOrderItem[]
  }
  code: 'OK' | 'CSRF Verification Error' | 'Market Not Allow Shop Display'
}

export type ShopSellOrderItem = {
  allow_bargain: boolean
  id: string
  price: string
  user_id: string
  is_cheapest: boolean
  created_at: number
  updated_at: number
  goods_id: number
  lowest_bargain_price: string
  asset_info: {
    paintwear: string
    classid: string
    assetid: string
    instanceid: string
    contextid: number
    info: {
      stickers: Sticker[]
    }
  }
}

export type ShopSellOrder = {
  data: {
    goods_infos: {
      [key: number]: {
        goods_id: number
        market_hash_name: string
        steam_price: string
      }
    }
    items: ShopSellOrderItem[]
  }
  code: 'OK' | 'CSRF Verification Error' | 'Market Not Allow Shop Display'
}

export type TopBookmarkedItem = {
  goods_id: number
  price: string
}

export type TopBookmarked = {
  data: {
    goods_infos: {
      [key: number]: {
        goods_id: number
        market_hash_name: string
        steam_price: string
      }
    }
    items: TopBookmarkedItem[]
  }
  code: string
}

export type BriefAsset = {
  data: {
    total_amount: number
    cash_amount: number
  }
}

export type Katowice14Item = {
  id: string
  goods_id: number
  created_at: number
  updated_at: number
  price: string
  sticker_premium: number
  asset_info: {
    paintwear: string
    classid: string
    assetid: string
    instanceid: string
    contextid: number
    info: {
      stickers: Sticker[]
    }
  }
}

export type Katowice14 = {
  data: {
    goods_infos: {
      [key: number]: {
        goods_id: number
        market_hash_name: string
        steam_price: string
      }
    }
    items: Katowice14Item[]
  }
}

export type Sticker = {
  category: 'sticker'
  goods_id: number
  img_url: string
  name: string
  sell_reference_price: string
  sticker_name: string
  wear: number
}

export type MarketItemDetail = {
  data: {
    asset_info: {
      stickers: Sticker[]
    }
  }
}

export type GoodsBuyResponse = {
  error: string
  code: 'OK' | 'CSRF Verification Error'
  data: unknown
}

export type CreateBargainResponse = {
  code: 'OK' | 'CSRF Verification Error'
  data: unknown
}

export type PayMethodItem = {
  balance: string
  enough: boolean
  error: string
  value: number
}

export type CreatePreviewBargainResponse = {
  code: 'OK' | 'CSRF Verification Error'
  data?: {
    pay_confirm?: {
      id: 'bargain_higher_price'
    }
    pay_methods: PayMethodItem[]
  }
}

export type CancelBargainResponse = {
  code: 'OK' | 'CSRF Verification Error'
  data: unknown
}

export type PostResponse = {
  code: 'OK' | 'CSRF Verification Error'
  data: unknown
}

export type MarketBatchFee = {
  data: {
    total_fee: string
  }
}

export type UserStorePopup = {
  data: {
    bookmark_count: number
    desc: string
    user: {
      nickname: string
    }
  }
  code: 'OK'
}

export type SentBargainItem = {
  id: string
  state: number
  goods_id: number
  price: string
  created_at: number
  can_cancel_time: number
  can_cancel_timeout: number
  original_price: string
  sell_order_id: string
  state_text: string
  seller_id: string
  asset_info: {
    paintwear: string
  }
}

export type SentBargain = {
  data: {
    items: SentBargainItem[]
    goods_infos: {
      [key: number]: {
        market_hash_name: string
      }
    }
  }
}

export type BuyOrderHistoryItem = {
  asset_info: {
    paintwear: string
    assetid: string
    classid: string
    info: {
      stickers: Sticker[]
      keychains: string[]
    }
  }
  price: string
}

export type BuyOrderHistory = {
  data: {
    items: BuyOrderHistoryItem[]
  }
}

export type SellOrderItem = {
  desc: string
  income: number
  price: string
  sell_order_id: string
}

export type SellOrderPayload = SellOrderItem & { goods_id: number; prev_price: number }

export type OnSaleItem = {
  id: string
  price: string
  income: string
  is_cheapest: boolean
  goods_id: number
  asset_info: {
    assetid: string
    classid: string
    instanceid: string
    paintwear: string
    contextid: number
    info: {
      stickers: Sticker[]
      keychains?: string[]
    }
  }
}

export type ItemsOnSale = {
  data: {
    items: OnSaleItem[]
    goods_infos: {
      [key: number]: {
        market_hash_name: string
      }
    }
  }
}

export type MarketGoodsItem = {
  id: number
  market_hash_name: string
  sell_min_price: string
  sell_reference_price: string
  goods_info: {
    steam_price: string
    icon_url: string
    info: {
      tags: {
        type: {
          id: number
          internal_name: 'type_customplayer' | 'csgo_tool_keychain' | 'csgo_tool_sticker'
        }
        quality: {
          id: number
          internal_name: 'normal' | 'strange'
        }
      }
    }
  }
  sell_num: number
}

export type MarketGoods = {
  data: {
    items: MarketGoodsItem[]
  }
  code: string
}

export type MarketGoodsBillOrderItem = {
  price: string
  updated_at: number
  type: number
  has_bargain: boolean
  seller_id: string
  original_price: string
}

export type MarketGoodsBillOrder = {
  data: {
    items: MarketGoodsBillOrderItem[]
  }
  code: string
}

export type GoodsInfo = {
  data: {
    goods_info: {
      goods_ref_price: string
    }
  }
  code: string
}

export type PriceHistoryItem = [number, number]

export type MarketPriceHistory = {
  data: {
    price_history: PriceHistoryItem[]
  }
}

export type SteamMarketPriceOverview = {
  lowest_price: string
  median_price: string
  success: boolean
  volume: string
}

export type SteamMarketPriceHistoryItem = [string, number, string]

export type SteamMarketPriceHistory = {
  success: boolean
  prices: SteamMarketPriceHistoryItem[]
}

type SteamListingInfoAsset = {
  link: string
  name: string
}

type SteamAssetDescription = {
  type: string
  value: string
}

type SteamListingInfoItem = {
  listingid: string
  converted_price: number
  converted_fee: number
  asset: {
    id: string
    market_actions: SteamListingInfoAsset[]
    contextid: string
  }
}

export type SteamMarketRender = {
  pagesize: number
  success: boolean
  total_count: number
  results_html: string
  listinginfo: {
    [listingid: string]: SteamListingInfoItem
  }
  assets: {
    [appid: number]: {
      [contextid: string]: {
        [id: string]: {
          market_actions: SteamListingInfoAsset[]
          descriptions: SteamAssetDescription[]
        }
      }
    }
  }
}

export enum MessageType {
  Purchased = 'PURCHASED',
  Review = 'REVIEW',
  Bargain = 'BARGAIN',
  ManualBargain = 'MANUAL_BARGAIN',
}

export enum Source {
  BUFF_FAST = 'BUFF_FAST',
  BUFF_BUFF = 'BUFF_BUFF',
  BUFF_DEFAULT = 'BUFF_DEFAULT',
  BUFF_STEAM = 'BUFF_STEAM',
  BUFF_BARGAIN = 'BUFF_BARGAIN',
  BUFF_KATOWICE = 'BUFF_KATOWICE',
}

export type TelegramResponse = {
  ok: boolean
  result: {
    message_id: number
  }
}

export type InspectInfoStickerItem = {
  name: string
  slot: number
  wear: null | number
}

export type InspectItemInfo = {
  iteminfo: {
    floatvalue: number
    full_item_name: string
    imageurl: string
    stickers: InspectInfoStickerItem[] | null
  }
}

export type CurrencyRates = {
  date: string
  base: 'USD'
  rates: Record<string, string>
}

type FloatItemFinderStickerItem = {
  name: string
  wear: number | null
}

export type FloatItemFinder = {
  paintwear: number
  stickers: FloatItemFinderStickerItem[]
}

type SIHInspectItemInfoStickerItem = {
  stickerId: number
  name: string
  wear: number
  imageUrl: string
  offset_x: number
  offset_y: number
}

export type SIHInspectItemInfo = {
  success: boolean
  iteminfo: {
    paintseed: number
    paintindex: number
    floatvalue: number
    stickers: SIHInspectItemInfoStickerItem[]
  }
}

type CSFloatListingItem = {
  created_at: string
  id: string
  price: number
  item: {
    market_hash_name: string
    float_value: number
    is_stattrak: boolean
    is_souvenir: boolean
    is_commodity: boolean
  }
  reference: {
    base_price: number
    last_updated: string
    predicted_price: number
    quantity: number
  }
  type: 'buy_now'
}

export type CSFloatListing = {
  data: CSFloatListingItem[]
}

export type SearchMarketRenderResultItem = {
  sell_listings: number
  sell_price: number
  sell_price_text: string
  asset_description: {
    market_hash_name: string
  }
}

export type SearchMarketRender = {
  searchdata: {
    query: string
  }
  results: SearchMarketRenderResultItem[]
}

export type SteamInventoryHelperSticker = {
  name: string
  slot: number
  wear: number
}

export type SteamInventoryHelperDetails = {
  success: boolean
  iteminfo: {
    full_item_name: string
    floatvalue: number
    stickers: SteamInventoryHelperSticker[]
  }
}

export type SteamMarketConfig = {
  market_hash_name: string
  proxy: string | null
}

export type SteamDBItem = Record<string, { goods_id: number; reference_price: number }>

export type ProxyState = {
  proxy: string
  active: boolean
  lastUsed: number
  bannedUntil: number
  userAgent: string
  isBusy: boolean
}

export type MarketHashNameState = {
  name: string
  lastRequested: number
  steamDataFetched: boolean
  referencePrice: number
  isInProgress: boolean
}

export type SteamMarketListingInfo = {
  [listingId: string]: {
    listingid: string
    price: number
    fee: number
    currencyid: number
    asset: {
      id: string
      market_actions: SteamListingInfoAsset[]
    }
  }
}

export type SteamMarketAssets = {
  [appid: number]: {
    [contextId: string]: {
      [id: string]: {
        id: string
        currencyid: number
        descriptions: SteamAssetDescription[]
        idListing: string
      }
    }
  }
}

export type Nullable<T> = T | null
