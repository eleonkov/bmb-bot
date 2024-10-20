import { formatDistance, isAfter, subHours, subMinutes } from 'date-fns'
import { MessageType, ShopBillOrderItem, Source } from './types'

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const median = (array: number[]): number => {
  const sorted = Array.from(array).sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (array.length === 0) return 0
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2

  return sorted[middle]
}

export const isLessThanXHours = (date: number, hours = 24) => {
  return isAfter(new Date(date * 1000), subHours(new Date(), hours))
}

export const isLessThanXMinutes = (date: number, minutes = 1) => {
  return isAfter(new Date(date * 1000), subMinutes(new Date(), minutes))
}

export const isLessThanThreshold = (aPrice: number, bPrice: number, threshold = 1) => {
  const priceDifference = Math.abs(aPrice - bPrice)
  const roundedDifference = Math.round(priceDifference * 100) / 100

  return roundedDifference < threshold
}

const messageTypeMapper = {
  [MessageType.Purchased]: '✅',
  [MessageType.Review]: '🔶',
  [MessageType.Bargain]: '🤝',
  [MessageType.ManualBargain]: '❗',
}

export const generateMessage = ({
  id,
  name,
  type,
  price,
  steamPrice,
  referencePrice,
  userAcceptBargains,
  userId,
  medianPrice,
  estimatedProfit,
  stickerPremium,
  source,
  stickerTotal = 0,
  createdAt,
  updatedAt,
  float,
  bargainPrice,
  refPriceDelta,
  positions,
}: {
  id: number
  name: string
  type: MessageType
  price: number
  steamPrice?: number
  referencePrice?: number
  medianPrice?: number
  estimatedProfit?: number
  source: Source
  createdAt?: number
  refPriceDelta?: number
  userAcceptBargains?: boolean
  userId?: string
  updatedAt?: number
  stickerTotal?: number
  float?: string
  bargainPrice?: number
  stickerPremium?: number
  positions?: number
}) => {
  const message: string[] = []

  const options = { addSuffix: true, includeSeconds: true }

  message.push(messageTypeMapper[type] + ' ')
  message.push(`<b>[${type}][${source}]</b> <a href="https://buff.market/market/goods/${id}">${name}</a>\n\n`)

  if (bargainPrice) message.push(`<b>Price</b>: <s>$${price}</s> $${bargainPrice}\n`)
  else message.push(`<b>Price</b>: $${price}\n`)

  if (steamPrice) {
    message.push(`<b>Steam price</b>: $${steamPrice}\n`)
  }

  if (referencePrice && refPriceDelta) {
    message.push(`<b>Reference price</b>: $${referencePrice} (${refPriceDelta.toFixed(2)}%)\n`)
  }

  if (createdAt) {
    message.push(`<b>Created at</b>: ${formatDistance(new Date(createdAt * 1000), new Date(), options)}\n`)
  }

  if (updatedAt) {
    message.push(`<b>Updated at</b>: ${formatDistance(new Date(updatedAt * 1000), new Date(), options)}\n`)
  }

  if (estimatedProfit && medianPrice) {
    message.push(`<b>Estimated profit</b>: ${estimatedProfit.toFixed(2)}% (if sold for $${medianPrice.toFixed(2)})\n`)
  }

  if (typeof positions === 'number') {
    message.push(`<b>Positions between median and current price</b>: ${positions}\n`)
  }

  if (float) {
    message.push(`<b>Float</b>: ${float}\n`)
  }

  if (stickerTotal > 0) {
    message.push(`<b>Sticker value</b>: $${stickerTotal.toFixed(2)}\n`)
  }

  if (stickerPremium) {
    message.push(`<b>Sticker premium</b>: ${stickerPremium}%\n`)
  }

  if (userId && userAcceptBargains) {
    message.push(
      `<b><a href="https://buff.market/user_store/${userId}/selling">${userId}</a> accept bargains</b>: YES\n`
    )
  }

  return message.join('')
}

export const getBargainDiscountPrice = (price: number, userSellingHistory: ShopBillOrderItem[]) => {
  const history = userSellingHistory.filter((item) => item.has_bargain)
  const percents = history.map((item) => (Number(item.original_price) / Number(item.price) - 1) * 100)

  return Number((price - price * ((median(percents) > 8 ? 10.5 : 5) / 100)).toFixed(2))
}
