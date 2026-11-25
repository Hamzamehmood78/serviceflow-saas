import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { assertAuthEnv } from './utils/tokens.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    assertAuthEnv();
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start();