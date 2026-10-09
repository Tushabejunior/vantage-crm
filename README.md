# Vantage

A sales and client management dashboard. Track sales commissions, clients by sector, services, meetings, KPIs, and generate daily, weekly, monthly, annual and all-time reports (CSV and PDF).

**Stack:** React + Vite + Tailwind CSS (frontend), Node.js + Express (backend), MySQL (database).

## Features

- Dashboard with revenue charts, upcoming meetings, and recent entries
- Ledger with filters, search, and full add/edit/delete
- Clients with sector tags, plus Services and Opportunities (dormant clients, cross-sell, retainer candidates)
- Calendar for scheduling client meetings
- Performance KPIs and a 15-day appraisal journal
- Reports with CSV and PDF export
- AI Insights (needs an Anthropic API key with credits)
- Dark and light themes, configurable company name
- Admin and read-only viewer logins

## Setup

### 1. Database
Create the database and tables:

```bash
mysql -u root -p < db/schema.sql
```

### 2. Backend
```bash
cd oneclick-backend
npm install
```

Create a `.env` file in `oneclick-backend`:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sales_ledger_db
JWT_SECRET=a_long_random_string
PORT=5000
ANTHROPIC_API_KEY=your_key_here
```

Start it:

```bash
npm run dev
```

### 3. Frontend
```bash
cd oneclick-frontend
npm install
npm run dev
```

Open http://localhost:5173. The first person to open the app creates the admin account. The admin can then add up to 3 read-only viewers from the profile menu.

## Notes

- `ANTHROPIC_API_KEY` is only needed for the AI Insights tab. The rest of the app works without it.
- Each company runs its own copy with its own database.