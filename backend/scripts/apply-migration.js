const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const sqlPath = path.join(__dirname, '../prisma/migrations/add_size_and_opening_side.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Разделяем SQL на отдельные команды
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log('Applying migration...');
    
    for (const command of commands) {
      if (command) {
        console.log(`Executing: ${command.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(command);
      }
    }
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
