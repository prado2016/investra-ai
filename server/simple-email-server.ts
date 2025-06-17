// Simple Email Connection Test Server
import express from 'express';
import cors from 'cors';
import emailConnectionTestRoute from './routes/emailConnectionTest';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email connection test server is running' });
});

// Email connection test route
app.use('/api/email', emailConnectionTestRoute);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email connection test server running on port ${PORT}`);
  console.log(`📧 Test endpoint: http://localhost:${PORT}/api/email/test-connection`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;
