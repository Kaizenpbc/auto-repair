# AutoShop AI – Frontend

A React + TypeScript frontend application for auto repair shop management that works with Supabase as the database backend.

## Features

- **Create Work Orders**: Generate demo work orders with brake pad replacement and oil change operations
- **Time Tracking**: Start/stop timers for technician work on specific operations
- **Draft Estimates**: Preview estimates with labor and parts
- **Invoice Generation**: Convert work orders to invoices with flat or actual billing
- **Tax & Shop Supplies**: Automatic calculation of taxes and shop supply charges

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and building
- Supabase for database and real-time data
- Clean CSS styling with responsive design

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## How It Works

This application uses **Supabase directly** instead of requiring a separate backend API. The database schema includes:

- `work_orders` - Main work order management
- `estimate_lines` - Labor operations and parts
- `time_logs` - Technician time tracking
- `invoices` - Generated invoices with calculations
- `invoice_lines` - Detailed invoice line items

## Usage

1. **Create a Work Order**: Click "Create Demo WO" to generate a work order with brake pad replacement and oil change operations
2. **Track Time**: Select an operation and use Start/Stop to track actual work hours
3. **Generate Estimate**: Click "Draft Estimate" to preview the estimate with labor and demo parts
4. **Create Invoice**: Choose flat (estimated) or actual (tracked) billing, set tax rate, then convert to invoice

## Database

The application automatically handles:
- **Money calculations** in cents for precision
- **Time tracking** with start/stop functionality
- **Invoice calculations** including subtotals, shop supplies (5%), and taxes
- **Flat vs actual billing** based on estimated hours or tracked time

## Development

The app is built with:
- **Type-safe API calls** using TypeScript
- **Real-time database operations** with Supabase
- **Error handling** with user-friendly messages
- **Responsive design** that works on desktop and mobile

All data is stored securely in Supabase with row-level security policies.