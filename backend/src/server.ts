import app from './app';
import { CONFIG, prisma } from './config';

const PORT = CONFIG.PORT || 5000;

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected successfully to College ERP Relational Database.');

    app.listen(PORT, () => {
      console.log(`🚀 College ERP Backend API running at http://localhost:${PORT}`);
      console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
      console.log(`🛡️  RBAC & Rate Limiting initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start College ERP backend:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected. Process terminated.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected. Process terminated.');
  process.exit(0);
});
