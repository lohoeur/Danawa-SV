# Danawa Sales Radar

## Overview

Danawa Sales Radar is a web application that tracks and analyzes Korean automotive sales data by scraping information from Danawa (a Korean price comparison and automotive data website). The application identifies "rapidly rising" car models by calculating derived metrics like month-over-month changes, rank changes, and composite scores. Users can filter and explore sales data through an interactive dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/` (shadcn/ui)
- Custom hooks in `client/src/hooks/`
- API client utilities in `client/src/lib/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints defined in `shared/routes.ts`
- **Validation**: Zod schemas shared between frontend and backend

Key backend patterns:
- Storage abstraction layer (`server/storage.ts`) for database operations
- Shared schema definitions (`shared/schema.ts`) for type safety across stack
- ETL logic for scraping and processing Danawa data using Cheerio and Axios

### Data Model
The core entity is `car_sales` which stores:
- Time period (year, month)
- Market segment (domestic/export)
- Model information and sales figures
- Derived metrics (month-over-month changes, rank changes, composite score)
- Source URL for data provenance

### Scoring Algorithm
"Rapidly rising" models are identified using a composite score based on:
1. Month-over-month absolute change (`momAbs`)
2. Month-over-month percentage change (`momPct`)
3. Rank change from previous month (`rankChange`)

Noise is filtered by requiring minimum sales thresholds (default: 300 units).

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations`

### Third-Party APIs/Services
- **Danawa Auto**: Data source for Korean car sales statistics
  - Domestic models: `https://auto.danawa.com/auto/?Nation=domestic&Tab=Model&Work=record`
  - Import models: `https://auto.danawa.com/auto/?Nation=export&Tab=Model&Work=record`
  - Note: Data is based on KAMA/KAIDA official figures with specific update schedules

### Key NPM Packages
- `cheerio`: HTML parsing for web scraping
- `axios`: HTTP client for fetching Danawa pages
- `drizzle-orm` / `drizzle-zod`: Type-safe database operations
- `@tanstack/react-query`: Async state management
- `date-fns`: Date formatting utilities
- Full shadcn/ui component suite via Radix UI primitives