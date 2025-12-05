'use strict';

import app from './app.js';
import initDatabase from './initDb.js';

// cd into backend/src and node server.js
const PORT = process.env.PORT || 3000;

// Initialize database before starting server (for Railway)
initDatabase()
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log(`StellarPoints backend listening on port ${PORT}`);
        });

        server.on('error', (err) => {
            console.error(`Cannot start server: ${err.message}`);
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database. Server will not start.', err);
        process.exit(1);
    });