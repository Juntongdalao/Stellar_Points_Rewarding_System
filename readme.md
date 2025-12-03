## Getting Started

### Prerequisites
- Node.js 22+ (the team uses Node 22.11/22.12 via [`nvm`](https://github.com/nvm-sh/nvm))
- npm 10+
- SQLite3 CLI (for inspecting the local DB)

### Install dependencies
```bash
# From the repo root
cd backend && npm install
cd ../frontend && npm install
```

### Environment setup
1. Copy `.env.example` inside `backend/` to `.env` and adjust secrets (JWT key, database URL, etc.).
2. Run Prisma migrations and seed data so the demo accounts exist:
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run seed   # if a seed script is available
   ```

### Running locally
In two terminals:
```bash
# Backend API (http://localhost:3000)
cd backend
npm run dev

# Frontend (Vite dev server on http://localhost:5173)
cd frontend
npm run dev
```
The Vite dev server proxies API calls to `http://localhost:3000` via `VITE_API_BASE_URL`. Adjust this value in `frontend/.env` if your backend runs elsewhere.

### Building for production
```bash
cd frontend
npm run build    # outputs static assets in frontend/dist

cd ../backend
npm run start    # serves the API; configure a static host (Netlify, Vercel, etc.) for the frontend bundle
```

### Testing
- Frontend unit tests: `cd frontend && npm test`
- Backend tests / linters: `cd backend && npm test`
- End-to-end (Cypress): ensure both servers are running, then `cd frontend && npx cypress open`

Document demo accounts and deployment URLs in `INSTALL`/`WEBSITE` as required by CSC309.
