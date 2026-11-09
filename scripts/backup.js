/**
 * College ERP - Automated Database Backup Engine
 * Supports SQLite snapshot backups and PostgreSQL pg_dump exports.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.resolve(__dirname, '../backups');

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runBackup() {
  ensureDirectoryExists(BACKUP_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const envPath = path.resolve(__dirname, '../backend/.env');

  let databaseUrl = 'file:./erp.db';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) databaseUrl = match[1];
  }

  console.log(`[ERP Backup] Starting backup at ${new Date().toLocaleString()}...`);

  if (databaseUrl.startsWith('file:') || databaseUrl.includes('.db')) {
    // SQLite Backup Procedure
    const relativeDbPath = databaseUrl.replace('file:', '').trim();
    const sourceDbPath = path.resolve(__dirname, '../backend/prisma', relativeDbPath);

    if (!fs.existsSync(sourceDbPath)) {
      console.error(`[ERP Backup Error] Source SQLite database file not found at: ${sourceDbPath}`);
      process.exit(1);
    }

    const backupFilePath = path.join(BACKUP_DIR, `college_erp_sqlite_backup_${timestamp}.db`);
    fs.copyFileSync(sourceDbPath, backupFilePath);

    const stats = fs.statSync(backupFilePath);
    console.log(`✅ [ERP Backup Success] SQLite snapshot verified:`);
    console.log(`   Location: ${backupFilePath}`);
    console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  } else if (databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql')) {
    // PostgreSQL Backup Procedure via pg_dump
    const backupFilePath = path.join(BACKUP_DIR, `college_erp_postgres_backup_${timestamp}.sql`);
    try {
      console.log(`[ERP Backup] Executing pg_dump for PostgreSQL connection...`);
      execSync(`pg_dump "${databaseUrl}" -F p -f "${backupFilePath}"`, { stdio: 'inherit' });
      console.log(`✅ [ERP Backup Success] PostgreSQL dump completed: ${backupFilePath}`);
    } catch (err) {
      console.error(`❌ [ERP Backup Error] pg_dump failed:`, err.message);
      process.exit(1);
    }
  } else {
    console.warn(`[ERP Backup] Unrecognized database URL protocol: ${databaseUrl}`);
  }
}

runBackup();

