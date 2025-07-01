/**
 * Authentication Middleware for Supabase JWT Tokens
 * Validates JWT tokens from the frontend and extracts user information
 */

const { createClient } = require('@supabase/supabase-js');
// const { User } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase configuration missing for authentication middleware');
  console.warn('    Authentication endpoints will not work without SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create Supabase client for authentication (may be null if config missing)
const supabaseAuth = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Extend Express Request to include user information
// interface AuthenticatedRequest extends express.Request {
//   user?: User;
//   userId?: string;
//   body: Record<string, unknown>; // Explicitly include body property
// }

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 */
const authenticateUser = async (req, res, next) => {
  try {
    if (!supabaseAuth) {
      res.status(500).json({
        success: false,
        error: 'Authentication service not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!authHeaderStr || !authHeaderStr.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header. Please provide a Bearer token.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeaderStr.substring(7); // Remove 'Bearer ' prefix

    // Validate the JWT token with Supabase
    console.log('🔐 Server auth debug:', {
      hasSupabaseAuth: !!supabaseAuth,
      tokenReceived: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'none',
      supabaseUrl: SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_ANON_KEY
    });

    const { data: { user }, error } = await supabaseAuth!.auth.getUser(token);

    if (error || !user) {
      console.warn('Authentication failed:', error?.message || 'No user found');
      console.warn('Auth debug details:', { error, user, tokenStart: token?.substring(0, 50) });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add user information to the request
    req.user = user;
    req.userId = user.id;

    console.log(`✅ User authenticated: ${user.email} (${user.id})`);
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication system error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional middleware that allows both authenticated and anonymous requests
 * Sets user info if token is provided and valid, but doesn't reject if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (!supabaseAuth) {
      // If Supabase is not configured, continue without authentication
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (authHeaderStr && authHeaderStr.startsWith('Bearer ')) {
      const token = authHeaderStr.substring(7);
      
      try {
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
        
        if (!error && user) {
          req.user = user;
          req.userId = user.id;
          console.log(`✅ Optional auth - User authenticated: ${user.email}`);
        }
      } catch (error) {
        console.warn('Optional auth failed (continuing anyway):', error);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue anyway for optional auth
  }
};


module.exports = { authenticateUser, optionalAuth };