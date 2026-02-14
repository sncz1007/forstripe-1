# Overview

This is a Chilean payment system application built with React/TypeScript frontend and Node.js/Express backend. The application enables users to submit payment requests for vehicle loan quotas by entering their Chilean RUT (tax ID), which are then processed by administrators through a real-time admin panel. The system includes Chilean RUT validation, WebSocket-based real-time communication, and integration with Kushki payment gateway for payment processing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for build tooling
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theming support via theme.json
- **State Management**: TanStack React Query for server state, local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Custom WebSocket hook for bidirectional communication

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Module System**: ESM (ES Modules) throughout the entire application
- **Real-time Communication**: WebSocket server using 'ws' library for admin-user coordination
- **Data Storage**: In-memory storage with Drizzle ORM prepared for PostgreSQL integration
- **API Design**: RESTful endpoints with WebSocket fallback for real-time features

## Payment Processing Architecture
- **Primary Provider**: Kushki payment gateway (Billpocket COMER DEL NOROESTE) for Chilean peso (CLP) payments
- **Payment Flow**: Frontend tokenizes card via Kushki.js CDN → sends token to backend → backend charges via Kushki API (synchronous confirmation)
- **API Endpoints**: Uses Kushki UAT environment (api-uat.kushkipagos.com) for testing
- **Security**: Server-side amount calculation prevents client tampering; Private Merchant ID stored as secret
- **RUT Validation**: Chilean tax ID validation with checksum verification

## Real-time Communication Design
- **WebSocket Management**: Separate client pools for administrators and regular users
- **State Synchronization**: Real-time updates between admin panel and user waiting screens
- **Connection Recovery**: Automatic reconnection and state restoration for interrupted connections
- **User Session Tracking**: Persistent session management across page refreshes

## Data Architecture
- **Schema Definition**: Shared TypeScript interfaces between client and server
- **Database Ready**: Drizzle configuration prepared for PostgreSQL with Neon serverless
- **Storage Strategy**: Memory-based storage for active sessions, database for persistence
- **Data Validation**: Zod schemas for runtime validation (implied by dependencies)

# External Dependencies

## Payment Providers
- **Kushki**: Primary payment processor via direct API integration (card tokenization + server-side charge)
- **Kushki.js CDN**: Frontend card tokenization library loaded from cdn.kushkipagos.com

## Database Services
- **Neon Database**: Serverless PostgreSQL provider via `@neondatabase/serverless`
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect configuration

## UI and Styling
- **Radix UI**: Comprehensive primitive component library for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Shadcn Theme System**: Dynamic theming via `@replit/vite-plugin-shadcn-theme-json`

## Development Tools
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Production bundling for server-side code

## Validation and Utilities
- **Chilean RUT Validation**: Custom implementation for Chilean tax ID verification
- **WebSocket Communication**: Native 'ws' library for real-time features
- **CORS**: Cross-origin resource sharing support via 'cors' middleware

## Replit-Specific Integrations
- **Cartographer**: Development tooling for Replit environment
- **Runtime Error Overlay**: Enhanced error reporting in development
- **Theme Plugin**: Integration with Replit's theming system