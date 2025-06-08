import { http, HttpResponse } from 'msw'
import { mockQuoteData, mockHistoricalData, mockSearchResults } from './data'
import { supabaseHandlers } from './supabaseHandlers'

export const handlers = [
  // Include all Supabase handlers
  ...supabaseHandlers,
  
  // Mock Yahoo Finance quote endpoint
  http.get('*/v8/finance/spark', () => {
    return HttpResponse.json(mockQuoteData.AAPL)
  }),

  // Mock Yahoo Finance historical data
  http.get('*/v8/finance/chart/:symbol', ({ params }) => {
    const symbol = params.symbol as string
    return HttpResponse.json(mockHistoricalData[symbol] || mockHistoricalData.AAPL)
  }),

  // Mock Yahoo Finance search
  http.get('*/v1/finance/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    
    const filteredResults = mockSearchResults.filter(result =>
      result.symbol.toLowerCase().includes(query.toLowerCase()) ||
      result.shortname?.toLowerCase().includes(query.toLowerCase())
    )
    
    return HttpResponse.json({
      explains: [],
      count: filteredResults.length,
      quotes: filteredResults.slice(0, 10), // Limit to 10 results
      news: [],
      nav: [],
      lists: [],
      researchReports: [],
      screenerFieldResults: [],
      totalTime: 12,
      timeTakenForQuotes: 8,
      timeTakenForNews: 2,
      timeTakenForAlgowatchlist: 1,
      timeTakenForPredefinedScreener: 1,
      timeTakenForCrunchbase: 0,
      timeTakenForNav: 1,
      timeTakenForResearchReports: 0
    })
  }),

  // Mock network error scenario
  http.get('*/error/network', () => {
    return HttpResponse.error()
  }),

  // Mock slow response scenario
  http.get('*/slow', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000))
    return HttpResponse.json({ message: 'Slow response' })
  }),

  // Mock server error
  http.get('*/error/server', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Mock rate limiting
  http.get('*/error/rate-limit', () => {
    return new HttpResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }),
]
