// Initialize database on server start (for Railway deployment)
'use strict';

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');

async function initDatabase() {
    try {
        console.log('Initializing database...');
        
        // Step 1: Generate Prisma Client (if not already done)
        try {
            execSync('npx prisma generate', {
                cwd: backendRoot,
                stdio: 'inherit'
            });
            console.log('✓ Prisma client generated');
        } catch (err) {
            console.warn('Prisma generate warning:', err.message);
        }

        // Step 2: Push schema to create tables
        try {
            execSync('npx prisma db push --accept-data-loss', {
                cwd: backendRoot,
                stdio: 'inherit'
            });
            console.log('✓ Database schema pushed');
        } catch (err) {
            console.error('Failed to push schema:', err.message);
            throw err;
        }

        // Step 3: Check if database is empty and seed if needed
        try {
            const userCount = await prisma.user.count();
            if (userCount === 0) {
                console.log('Database is empty. Seeding...');
                execSync('npm run seed', {
                    cwd: backendRoot,
                    stdio: 'inherit'
                });
                console.log('✓ Database seeded');
            } else {
                console.log(`✓ Database already has ${userCount} users`);
            }
        } catch (err) {
            console.warn('Seeding warning (continuing anyway):', err.message);
        }

        console.log('Database initialization complete!');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

export default initDatabase;

