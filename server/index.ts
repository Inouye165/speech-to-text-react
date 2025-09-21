import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createMultiListRoutes } from './multiListApi';

const app = express();
app.use(cors());
app.use(express.json());

// Multi-list API routes
app.use('/api/lists', createMultiListRoutes());

// Export for testing
export { app };

// Start server
async function startServer() {
  // Only start the server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
    app.listen(PORT, () => console.log(`Speech-to-Text Lists API running on http://localhost:${PORT}`));
  }
}

startServer().catch(console.error);