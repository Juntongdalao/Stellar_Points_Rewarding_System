# StellarPoints

A comprehensive points-based reward system for managing user transactions, events, promotions, and more. StellarPoints provides role-based access control with interfaces for regular users, cashiers, managers, event organizers, and superusers.

## 🌐 Live Deployment

**URL:** [https://stellarfrontend-production.up.railway.app/](https://stellarfrontend-production.up.railway.app/)

### Demo Credentials

**Superuser Account:**
- **UTORid:** `superman`
- **Password:** `1uta716eejnoa161vdsj3h2v1zvihny9`

> **Note:** The demo database includes 30 users, 30 events, 30 promotions, and 120+ transactions. All demo users share the same password as the superuser account above.

## ✨ Features

### For Regular Users
**Example Regular Account:**
- **UTORid:** `neville1`
- **Password:** `1uta716eejnoa161vdsj3h2v1zvihny9`

- **Points Management**: View current points balance and transaction history
- **QR Code**: Generate and display personal QR code for point transactions
- **Events**: Browse and RSVP to events, view event details and locations
- **Interactive Map**: View all events on an interactive Google Maps interface with clickable markers
- **Promotions**: View available promotions and their terms
- **Transfers**: Send points to other users
- **Redemptions**: Redeem points for rewards
- **Profile Management**: Update personal information and reset password

### For Cashiers
**Example Cashier Account:**
- **UTORid:** `hermione`
- **Password:** `1uta716eejnoa161vdsj3h2v1zvihny9`

- **Transaction Processing**: Create new purchase transactions for customers
- **Redemption Processing**: Process point redemptions
- **Dashboard**: Quick access to transaction creation and processing tools

### For Event Organizers
**Example Organizer Account:**
- **UTORid:** `harrypot`
- **Password:** `1uta716eejnoa161vdsj3h2v1zvihny9`

- **Event Management**: Create, edit, and manage events you organize
- **Point Awards**: Award points to individual guests or all RSVP'd attendees
- **Event Details**: View comprehensive event information including guest lists
- **Event Analytics**: Track event capacity, points awarded, and attendance

### For Managers
**Example Manager Account:**
- **UTORid:** `yoda1234`
- **Password:** `1uta716eejnoa161vdsj3h2v1zvihny9`

- **User Management**: 
  - View all users with advanced filtering, sorting, and pagination
  - Update user roles (promote to cashier, etc.)
  - Verify users and mark suspicious accounts
  - Create new user accounts
- **Transaction Management**:
  - View all transactions across the system
  - Filter and sort transactions by various criteria
  - View detailed transaction information
  - Create adjustment transactions
  - Mark transactions as suspicious
- **Promotion Management**:
  - Create, edit, and delete promotions
  - View all promotions with filtering and sorting
  - Manage promotion schedules and terms
- **Event Management**:
  - Create, edit, and delete events
  - View all events with filtering and sorting
  - Add or remove users from events
  - Set event capacity and point values
  - Configure event locations with automatic geocoding

### For Superusers
- Full access to all manager features
- Complete system administration capabilities

## Technology Stack

- **Frontend**: React + Vite, Tailwind CSS, DaisyUI
- **Backend**: Node.js + Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based authentication
- **Maps**: Google Maps JavaScript API for event location visualization
- **State Management**: Zustand
- **Data Fetching**: React Query

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

## Additional Information

For detailed setup instructions, see the `INSTALL` file. The application is deployed on Railway with automatic database initialization and seeding on each deployment.
