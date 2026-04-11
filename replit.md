  # Portfolio Tracker Application

  ## Overview

  This is a Turkish investment portfolio tracking application built for Turkish investors to monitor their positions in BIST (Borsa Istanbul) stocks and TEFAS mutual funds. The application provides real-time portfolio tracking, profit/loss calculations, and position management capabilities.

  **Recent Changes (January 2025):** 
  - Removed Markets tab/page initially to focus on portfolio management
  - Added back bottom navigation with two tabs: "Portföy" (Portfolio) and "Analiz" (Analytics)
  - Created Analytics page with profit/loss analysis and performance metrics
  - Removed floating action button per user preference
  - Added prominent "Pozisyon Ekle" button at top of portfolio page
  - Fixed date filtering in Analytics to work with position open/close dates
  - Implemented proper minus (-) sign display for all loss positions across the app
  - Completed comprehensive profit/loss formatting with consistent negative value display
  - **Mobile UX Improvements (January 28, 2025):**
    - Converted all modal dialogs to native-style bottom sheets using Vaul library
    - Fixed position editing functionality with proper PATCH endpoint implementation
    - Resolved mobile keyboard interaction issues with CSS optimizations
    - Added safe area support and proper scroll behavior for iOS devices
    - Optimized bottom sheet sizing for better mobile experience (max-height constraints)
  - **TEFAS Fund System Improvements (January 28, 2025):**
    - Enhanced TEFAS fund price system with realistic daily variation
    - Added proper Turkish fund names for known TEFAS codes (IRY, YAC, ALC, etc.)
    - Implemented consistent daily pricing that simulates real fund behavior
    - Fund prices now update once per day as per real TEFAS behavior
    - Fixed fund name display in position cards and throughout the app
  - **Position Editing Removal (January 28, 2025):**
    - Completely removed position editing functionality due to recurring bugs and complexity
    - Position detail modal converted to read-only view with clean UI
    - Removed Edit buttons from position cards and detail modals
    - Simplified user interface focusing on view, close, and delete actions only
    - Changed "Maliyet" label to "Alış Tutarı" in position details for clarity
  - **iOS-Style Position Detail Modal (January 28, 2025):**
    - Redesigned position detail modal with native iOS-style interface
    - Removed complex performance metrics section for cleaner UX
    - Added icon-based information cards with rounded corners and subtle shadows
    - Implemented gradient P&L display with prominent visual indicators
    - Enhanced mobile-first design with better spacing and typography
  - **UI Simplification (January 28, 2025):**
    - Removed "Gelişmiş Analizler" card from Analytics page for cleaner interface
    - Removed all icons from Analytics card headers for minimal design
    - Removed circular symbol logos from position cards for simplicity
    - Enhanced action buttons in position cards - larger and more user-friendly
  - **iOS-Style K/Z Display (January 28, 2025):**
    - Applied consistent gradient K/Z (profit/loss) styling to both active and closed position cards
    - Implemented green gradient for profits, red gradient for losses across all position displays
    - Added proper +/- prefix formatting with bold typography for better visual impact
  - **Closed Position Enhancement (January 28, 2025):**
    - Added opening and closing dates to closed position cards
    - Redesigned layout with dates on left side and compact delete button (trash icon only) on right
    - Optimized space usage while maintaining iOS-style visual consistency
  - **iOS-Style Dark Mode Implementation (January 28, 2025):**
    - Added comprehensive dark/light theme support with CSS variables
    - Implemented ThemeProvider with localStorage persistence and error handling
    - Added theme toggle buttons (moon/sun icons) in both Portfolio and Analytics page headers
    - Applied dark mode styling to all UI components including position cards, portfolio summary, bottom navigation
    - Enhanced gradient K/Z displays with proper dark mode color variants
    - Fixed theme provider context issues for stable mobile browser compatibility
    - **Complete Dark Mode Coverage (January 28, 2025):**
      - Analytics page cards (Portfolio Overview, Profit/Loss Summary, Performance Metrics) fully dark mode compatible
      - Position Detail Modal with iOS-style dark gradients and proper color schemes
      - Add Position Modal with dark-aware form controls and buttons
      - Full-screen modal backgrounds and headers optimized for dark mode
      - All text colors, borders, backgrounds, and interactive elements properly themed
      - Portfolio table view (position-table) fully dark mode compatible with proper hover effects
      - Unified color scheme using night blue tones (gray-800/gray-900) instead of harsh blacks
      - Single view toggle button in header showing current active view with seamless switching
  - **Global Table View Implementation (January 28, 2025):**
    - Added comprehensive table view for closed positions matching active positions design
    - Implemented sticky first column structure for both active and closed position tables
    - Fixed K/Z data display in closed positions table using correct `pl` and `plPercent` fields
    - Added item count indicators to both table views showing number of listed positions
    - Ensured global view switching works across both active and closed position tabs
    - Maintained consistent UI design language between both table implementations

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
  - **Two-Tab Navigation**: Portfolio management and Analytics with bottom navigation
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
  4. **Analytics Dashboard**: Dedicated analytics page with P/L analysis, performance metrics, and time-based filtering
  5. **Dual View Modes**: Card view for detailed display, table view for compact overview
  6. **Direct Action Buttons**: Edit, Close, and Delete buttons directly on position cards
  7. **Position Detail Modal**: Complete editing interface accessible via position clicks
  8. **Historical Records**: Complete trade history with performance metrics
  9. **Turkish Number Format**: Proper handling of Turkish decimal notation (comma instead of dot)
  10. **Two-Tab Navigation**: Bottom navigation between Portfolio and Analytics sections

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