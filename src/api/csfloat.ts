import axios from 'axios'

import { CSFloatListing } from '../types'

const http = axios.create({
  baseURL: 'https://csfloat.com/api',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
})

export const getCSFloatListings = async ({
  type = 'buy_now',
  limit = 40,
  min_float,
  max_float,
  market_hash_name,
}: {
  type?: string
  limit?: number
  min_float?: number
  max_float?: number
  market_hash_name: string
}): Promise<CSFloatListing> => {
  const { data } = await http.get('/v1/listings', {
    params: { limit, type, min_float, max_float, market_hash_name },
    headers: {
      Cookie:
        'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbV9pZCI6Ijc2NTYxMTk5NjI1NTU0OTc1Iiwibm9uY2UiOjAsImltcGVyc29uYXRlZCI6ZmFsc2UsImlzcyI6ImNzdGVjaCIsImV4cCI6MTczNjAwMDI1MH0.s4KtsvDD5mUKlxgo0X6Zs5dfz5RBXQv5V9oNnnTSZRQ',
    },
  })

  return data
}
