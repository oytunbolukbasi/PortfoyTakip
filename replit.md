# Portfolio Tracker Application

## Overview

This is a Turkish investment portfolio tracking application built for Turkish investors to monitor their positions in BIST (Borsa Istanbul) stocks and TEFAS mutual funds. The application provides real-time portfolio tracking, profit/loss calculations, and position management capabilities.

**Recent Change (January 2025):** Simplified the application by removing the Markets tab/page to focus solely on portfolio management functionality. The app now has a single-page design with enhanced position tracking features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Validation**: Zod schemas shared between client and server

### Mobile-First Design
- **Responsive**: Mobile-first approach with iPhone-style native UX/UI
- **Components**: Touch-friendly UI components optimized for mobile devices
- **Single Page App**: Simplified design focusing only on portfolio management
- **PWA Ready**: Structure supports Progressive Web App features

## Key Components

### Database Schema
- **Users**: User authentication and profile management
- **Positions**: Active investment positions with real-time tracking
- **Closed Positions**: Historical records of closed trades
- **Price History**: Time-series data for price tracking and analytics

### Price Service Integration
- **Google Finance Integration**: Direct URL format (SYMBOL:IST) for accurate BIST stock prices
- **Turkish Price Format**: Proper handling of Turkish decimal notation (22,94 → 22.94)
- **Real-time Monitoring**: Automatic price updates every 5 minutes
- **Manual Price Control**: "Fiyatları Güncelle" button for on-demand updates
- **Continuous Monitoring**: Background service for real-time portfolio tracking
- **BIST Stocks**: Enhanced Google Finance integration with CSS selectors (.YMlKec.fxKbKc)
- **TEFAS Funds**: Web scraping from official TEFAS website
- **Authenticated Data**: Current market prices for major Turkish stocks (AKFIS: 22.94 TL)
- **Position Detail Modal**: Complete editing interface for all position data

### Core Features
1. **Portfolio Management**: Add, edit, and close investment positions
2. **Real-time Tracking**: Automatic price updates and P/L calculations
3. **Performance Analytics**: Portfolio summary with total returns and daily changes
4. **Dual View Modes**: Card view for detailed display, table view for compact overview
5. **Direct Action Buttons**: Edit, Close, and Delete buttons directly on position cards
6. **Position Detail Modal**: Complete editing interface accessible via position clicks
7. **Historical Records**: Complete trade history with performance metrics
8. **Turkish Number Format**: Proper handling of Turkish decimal notation (comma instead of dot)

## Data Flow

### Position Creation Flow
1. User submits position form through React Hook Form
2. Client validates data using shared Zod schemas
3. Server receives validated data and fetches current price
4. Position stored in database with initial price data
5. Client refreshes position list via React Query

### Price Update Flow
1. Background service fetches prices from external APIs
2. Price data stored in price_history table
3. Position records updated with current prices
4. Client receives real-time updates through polling
5. UI reflects updated P/L calculations

### Portfolio Calculation Flow
1. Client aggregates all active positions
2. Calculates total portfolio value, cost basis, and returns
3. Computes daily changes and performance metrics
4. Displays summary in responsive portfolio dashboard

## External Dependencies

### Price Data Sources
- **Google Finance**: Primary source for BIST stock prices
- **TEFAS Website**: Official source for Turkish mutual fund prices
- **Cheerio**: HTML parsing for web scraping price data
- **Axios**: HTTP client for API requests

### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent UI elements
- **Class Variance Authority**: Type-safe CSS-in-JS variant handling

### Development Tools
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast bundling for production builds
- **Drizzle Kit**: Database migration and schema management
- **React Query Devtools**: Development debugging tools

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React application to static assets
2. **Backend**: ESBuild bundles Node.js server with external dependencies
3. **Database**: Drizzle migrations ensure schema consistency
4. **Assets**: Static files served from dist/public directory

### Production Configuration
- **Environment Variables**: DATABASE_URL for PostgreSQL connection
- **Process Management**: NODE_ENV-based configuration
- **Static Serving**: Express serves built React application
- **Error Handling**: Centralized error middleware with logging

### Development Features
- **Hot Reload**: Vite HMR for rapid development cycles
- **Development Middleware**: Request logging and error overlays
- **Database Tools**: Drizzle Studio integration for database management
- **Type Checking**: Continuous TypeScript validation

### Scalability Considerations
- **Serverless Ready**: Neon PostgreSQL supports serverless deployment
- **Stateless Server**: Session-free API design for horizontal scaling
- **Optimistic Updates**: Client-side optimizations reduce server load
- **Efficient Queries**: Drizzle ORM with optimized database queries