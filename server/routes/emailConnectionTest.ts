/**
 * Email Connection Test API Endpoint
 * Provides connection testing functionality for external email providers
 */

import express from 'express';
import { ImapFlow } from 'imapflow';

const router = express.Router();

interface EmailConnectionTestRequest {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

interface EmailConnectionTestResponse {
  success: boolean;
  message: string;
  details?: {
    serverInfo?: unknown;
    responseTime: number;
    capabilities?: string[];
  };
  error?: string;
}

/**
 * POST /api/email/test-connection
 * Test email connection with provided IMAP settings
 */
router.post('/test-connection', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { host, port, secure, username, password }: EmailConnectionTestRequest = req.body;

    // Validate required fields
    if (!host || !port || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required connection details',
        error: 'Host, port, username, and password are required'
      } as EmailConnectionTestResponse);
    }

    // Validate port range
    if (port < 1 || port > 65535) {
      return res.status(400).json({
        success: false,
        message: 'Invalid port number',
        error: 'Port must be between 1 and 65535'
      } as EmailConnectionTestResponse);
    }

    // Create IMAP configuration
    const imapConfig = {
      host,
      port,
      secure,
      auth: {
        user: username,
        pass: password
      },
      logger: false
    };

    // Real IMAP connection testing
    let client: ImapFlow | null = null;
    
    try {
      client = new ImapFlow(imapConfig);
      
      // Connect with timeout
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout (10 seconds)')), 10000)
        )
      ]);

      // Get server info and capabilities
      const serverInfo = client.serverInfo;
      const capabilities = Array.from(client.capabilities || []);
      const responseTime = Date.now() - startTime;

      // Close connection gracefully
      await client.logout();

      res.json({
        success: true,
        message: `Successfully connected to ${host}`,
        details: {
          serverInfo: {
            host,
            port,
            secure,
            vendor: serverInfo?.vendor,
            name: serverInfo?.name,
            version: serverInfo?.version,
            greeting: serverInfo?.greeting
          },
          responseTime,
          capabilities: capabilities.length > 0 ? capabilities : ['IMAP4REV1']
        }
      } as EmailConnectionTestResponse);

    } catch (connectionError) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Unknown connection error';
      
      if (connectionError instanceof Error) {
        errorMessage = connectionError.message;
        
        // Provide more helpful error messages
        if (errorMessage.includes('ENOTFOUND')) {
          errorMessage = `Cannot resolve hostname "${host}". Please check the server address.`;
        } else if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = `Connection refused by server. Please check the port (${port}) and ensure the server is running.`;
        } else if (errorMessage.includes('timeout')) {
          errorMessage = `Connection timeout. The server at ${host}:${port} is not responding.`;
        } else if (errorMessage.includes('authentication') || errorMessage.includes('Invalid credentials')) {
          errorMessage = 'Authentication failed. Please check your username and password.';
        } else if (errorMessage.includes('TLS') || errorMessage.includes('SSL')) {
          errorMessage = `SSL/TLS error. Try ${secure ? 'disabling' : 'enabling'} SSL encryption.`;
        }
      }

      // Try to close connection if it was opened
      if (client) {
        try {
          await client.logout();
        } catch {
          // Ignore logout errors
        }
      }

      res.status(422).json({
        success: false,
        message: 'Failed to connect to email server',
        error: errorMessage,
        details: {
          responseTime
        }
      } as EmailConnectionTestResponse);
    }


  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      message: 'Internal server error during connection test',
      error: errorMessage,
      details: {
        responseTime
      }
    } as EmailConnectionTestResponse);
  }
});

export default router;
