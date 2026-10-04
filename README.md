# Expense Tracker UI

React frontend for the Finance Tracker backend. The home dashboard filters by date and visualizes debit spending by category with ranked bars and a spending-share chart.

## Stack

- React 18 + TypeScript + Vite
- React Router
- Recharts

## Run

Create a Google OAuth client ID for a web application and add `http://localhost:5173` as an authorized JavaScript origin. Put the client ID in `.env.local`:

```dotenv
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

The backend must be running on `http://localhost:8080` with the matching `APP_AUTH_GOOGLE_CLIENT_ID` configured.

```bash
cd expense-tracker-ui
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Spring Boot server.

## Pages

| Route | Feature |
|-------|---------|
| `/` | Dashboard — date-filtered category charts, cash-flow summary, and monthly gross/debit/credit totals |
| `/import` | Upload GPay CSV/PDF |
| `/transactions` | List, override category, recategorize, or run AI categorization with a transaction limit |
| `/categories` | CRUD |
| `/merchants` | CRUD |
| `/rules` | Create / list / delete categorization rules |
| `/accounts` | CRUD |
