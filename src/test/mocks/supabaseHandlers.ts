import { http, HttpResponse } from 'msw'

// Mock Supabase environment variables for testing
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'

// Mock user data for testing
const mockUsers = {
  'test@example.com': {
    id: 'test-user-id-1',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    phone_confirmed_at: null,
    confirmation_sent_at: '2024-01-01T00:00:00Z',
    recovery_sent_at: null,
    last_sign_in_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {}
  },
  'user2@example.com': {
    id: 'test-user-id-2',
    email: 'user2@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    phone_confirmed_at: null,
    confirmation_sent_at: '2024-01-01T00:00:00Z',
    recovery_sent_at: null,
    last_sign_in_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {}
  }
}

// Mock session data
const mockSessions = {
  'valid-token': {
    access_token: 'valid-token',
    refresh_token: 'valid-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUsers['test@example.com']
  }
}

// Mock database records
let mockDatabase = {
  profiles: [
    {
      id: 'test-user-id-1',
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  transactions: [],
  positions: [],
  watchlist_items: []
}

// Reset mock database for tests
export const resetMockDatabase = () => {
  mockDatabase = {
    profiles: [
      {
        id: 'test-user-id-1',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    transactions: [],
    positions: [],
    watchlist_items: []
  }
}

export const supabaseHandlers = [
  // Authentication endpoints
  
  // Sign up
  http.post(`${SUPABASE_URL}/auth/v1/signup`, async ({ request }) => {
    const body = await request.json() as any
    const { email, password } = body
    
    if (!email || !password) {
      return HttpResponse.json({
        error: {
          message: 'Invalid email or password',
          status: 400
        }
      }, { status: 400 })
    }
    
    if (mockUsers[email as keyof typeof mockUsers]) {
      return HttpResponse.json({
        error: {
          message: 'User already exists',
          status: 400
        }
      }, { status: 400 })
    }
    
    const newUser = {
      id: `test-user-${Date.now()}`,
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: null,
      confirmation_sent_at: new Date().toISOString(),
      recovery_sent_at: null,
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {}
    }
    
    return HttpResponse.json({
      data: {
        user: newUser,
        session: {
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: newUser
        }
      },
      error: null
    })
  }),
  
  // Sign in
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json() as any
    const { email, password, grant_type } = body
    
    if (grant_type === 'password') {
      if (!email || !password) {
        return HttpResponse.json({
          error: {
            message: 'Invalid login credentials',
            status: 400
          }
        }, { status: 400 })
      }
      
      const user = mockUsers[email as keyof typeof mockUsers]
      if (!user) {
        return HttpResponse.json({
          error: {
            message: 'Invalid login credentials',
            status: 400
          }
        }, { status: 400 })
      }
      
      if (password !== 'password123') {
        return HttpResponse.json({
          error: {
            message: 'Invalid login credentials',
            status: 400
          }
        }, { status: 400 })
      }
      
      return HttpResponse.json({
        data: {
          user,
          session: mockSessions['valid-token']
        },
        error: null
      })
    }
    
    return HttpResponse.json({
      error: {
        message: 'Unsupported grant type',
        status: 400
      }
    }, { status: 400 })
  }),
  
  // Get user
  http.get(`${SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        error: {
          message: 'JWT token is missing or invalid',
          status: 401
        }
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const session = mockSessions[token as keyof typeof mockSessions]
    
    if (!session) {
      return HttpResponse.json({
        error: {
          message: 'JWT token is missing or invalid',
          status: 401
        }
      }, { status: 401 })
    }
    
    return HttpResponse.json({
      data: {
        user: session.user
      },
      error: null
    })
  }),
  
  // Sign out
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({
      data: {},
      error: null
    })
  }),
  
  // Database REST API endpoints
  
  // Profiles
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, ({ request }) => {
    const url = new URL(request.url)
    const select = url.searchParams.get('select')
    const id = url.searchParams.get('id')
    
    let results = mockDatabase.profiles
    
    if (id) {
      results = results.filter(profile => profile.id === id)
    }
    
    return HttpResponse.json(results)
  }),
  
  http.post(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
    const body = await request.json() as any
    const newProfile = {
      id: body.id || `profile-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    mockDatabase.profiles.push(newProfile)
    
    return HttpResponse.json([newProfile])
  }),
  
  http.patch(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
    const body = await request.json() as any
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return HttpResponse.json({
        error: {
          message: 'Missing id parameter',
          status: 400
        }
      }, { status: 400 })
    }
    
    const profileIndex = mockDatabase.profiles.findIndex(p => p.id === id)
    if (profileIndex === -1) {
      return HttpResponse.json({
        error: {
          message: 'Profile not found',
          status: 404
        }
      }, { status: 404 })
    }
    
    mockDatabase.profiles[profileIndex] = {
      ...mockDatabase.profiles[profileIndex],
      ...body,
      updated_at: new Date().toISOString()
    }
    
    return HttpResponse.json([mockDatabase.profiles[profileIndex]])
  }),
  
  // Transactions
  http.get(`${SUPABASE_URL}/rest/v1/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    let results = mockDatabase.transactions
    
    if (userId) {
      results = results.filter((transaction: any) => transaction.user_id === userId)
    }
    
    return HttpResponse.json(results)
  }),
  
  http.post(`${SUPABASE_URL}/rest/v1/transactions`, async ({ request }) => {
    const body = await request.json() as any
    const newTransaction = {
      id: `transaction-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    mockDatabase.transactions.push(newTransaction)
    
    return HttpResponse.json([newTransaction])
  }),
  
  // Positions
  http.get(`${SUPABASE_URL}/rest/v1/positions`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    let results = mockDatabase.positions
    
    if (userId) {
      results = results.filter((position: any) => position.user_id === userId)
    }
    
    return HttpResponse.json(results)
  }),
  
  http.post(`${SUPABASE_URL}/rest/v1/positions`, async ({ request }) => {
    const body = await request.json() as any
    const newPosition = {
      id: `position-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    mockDatabase.positions.push(newPosition)
    
    return HttpResponse.json([newPosition])
  }),
  
  // Watchlist
  http.get(`${SUPABASE_URL}/rest/v1/watchlist_items`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    let results = mockDatabase.watchlist_items
    
    if (userId) {
      results = results.filter((item: any) => item.user_id === userId)
    }
    
    return HttpResponse.json(results)
  }),
  
  http.post(`${SUPABASE_URL}/rest/v1/watchlist_items`, async ({ request }) => {
    const body = await request.json() as any
    const newItem = {
      id: `watchlist-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    mockDatabase.watchlist_items.push(newItem)
    
    return HttpResponse.json([newItem])
  }),
  
  // Error scenarios for testing
  http.get(`${SUPABASE_URL}/rest/v1/error/unauthorized`, () => {
    return HttpResponse.json({
      error: {
        message: 'JWT token is missing or invalid',
        status: 401
      }
    }, { status: 401 })
  }),
  
  http.get(`${SUPABASE_URL}/rest/v1/error/forbidden`, () => {
    return HttpResponse.json({
      error: {
        message: 'Forbidden',
        status: 403
      }
    }, { status: 403 })
  }),
  
  http.get(`${SUPABASE_URL}/rest/v1/error/server`, () => {
    return HttpResponse.json({
      error: {
        message: 'Internal Server Error',
        status: 500
      }
    }, { status: 500 })
  }),
  
  // Real-time WebSocket mock (simplified)
  http.get(`${SUPABASE_URL}/realtime/v1/*`, () => {
    return HttpResponse.json({
      message: 'WebSocket endpoint - use WebSocket mocking for real-time tests'
    })
  })
]

// Helper function to add test data
export const addMockData = {
  profile: (profile: any) => {
    mockDatabase.profiles.push({
      ...profile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  },
  
  transaction: (transaction: any) => {
    mockDatabase.transactions.push({
      id: `transaction-${Date.now()}`,
      ...transaction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  },
  
  position: (position: any) => {
    mockDatabase.positions.push({
      id: `position-${Date.now()}`,
      ...position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  },
  
  watchlistItem: (item: any) => {
    mockDatabase.watchlist_items.push({
      id: `watchlist-${Date.now()}`,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
}

// Helper function to get mock data
export const getMockData = () => mockDatabase
