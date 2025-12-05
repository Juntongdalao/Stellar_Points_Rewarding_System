'use strict';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (one level up from src/)
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();

// Global middlewares

// CORS: Allow all origins (required for Railway deployment)
// This allows both localhost (dev) and Railway frontend (production) to access the backend
app.use(cors({
    origin: true,  // Allow all origins - Railway frontend is at a different domain
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
}));

app.use(express.json()); // Parses incoming JSON request bodies (access via req.body)

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use(transactionRoutes);
app.use(eventRoutes);
app.use(promotionRoutes);

export default app;