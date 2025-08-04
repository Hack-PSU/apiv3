# HackPSU API v3

Official backend API for the HackPSU hackathon event management platform. This internal service provides comprehensive functionality for managing hackathon participants, events, judging, sponsors, and administrative operations.

## Project Overview

HackPSU API v3 is a Node.js backend service that powers the HackPSU hackathon platform. The API manages the complete hackathon lifecycle including user registration, event scheduling, project judging, sponsor management, digital wallet integration, and real-time communication. Built for Penn State's annual hackathon, it serves hundreds of participants, organizers, judges, and sponsors.

The system is designed for high availability during hackathon weekends while providing robust administrative tools for year-round event management and planning.

### Target Users
- **Hackathon Participants**: Registration, event check-ins, project submissions
- **Organizers**: Event management, user administration, analytics
- **Judges**: Project evaluation and scoring
- **Sponsors**: Booth management and participant interaction
- **System Administrators**: Platform monitoring and configuration

### Key Capabilities
- Complete user lifecycle management with Firebase authentication
- Event scheduling and QR-code based check-in system
- Project submission and judging workflow
- Digital wallet integration (Apple Wallet, Google Pay) for event passes
- Real-time notifications and WebSocket communication
- Sponsor management and interaction tracking
- Finance and reimbursement processing
- Inventory management for hackathon supplies
- Analytics and reporting for event metrics

## Tech Stack

### Core Framework
- **NestJS** - Enterprise-grade Node.js framework providing dependency injection, modular architecture, and TypeScript support
- **TypeScript** - Type-safe development with enhanced code reliability and developer experience
- **Node.js** - Runtime environment optimized for I/O intensive operations

### Database & ORM
- **MySQL** - Primary relational database for structured data storage
- **Knex.js** - SQL query builder for database migrations and raw queries
- **Objection.js** - Object-relational mapper built on Knex providing model relationships and validation

### Authentication & Backend Integration
- **Firebase Authentication** - OAuth integration and user identity management
- **Firebase Admin SDK** - Server-side Firebase operations and user management
- **Google Cloud Platform** - Cloud services integration including Firestore and messaging
- **Passport.js** - Authentication middleware with JWT strategy implementation

### API Documentation & Validation
- **Swagger/OpenAPI** - Comprehensive API documentation with interactive testing interface
- **Class Validator** - Decorator-based request validation and transformation
- **Class Transformer** - Object serialization and deserialization

### Email & Communication
- **SendGrid** - Transactional email delivery with template management
- **MJML** - Email template framework for responsive email design
- **Socket.IO** - Real-time bidirectional communication for live updates

### Digital Wallet Integration
- **Passkit Generator** - Apple Wallet pass creation and management
- **Google Wallet API** - Google Pay pass integration for digital tickets

### File Processing & Utilities
- **Multer** - File upload handling for resumes, receipts, and media
- **PDF-lib** - PDF document generation and manipulation
- **Archiver** - File compression for bulk downloads
- **Lodash** - Utility library for data manipulation
- **Luxon** - DateTime handling and timezone management

### Development Tools
- **Jest** - Testing framework with coverage reporting
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting standardization
- **Docker** - Containerization for consistent development and deployment environments

## Architecture & Design Decisions

### Modular NestJS Architecture
- Domain-driven module organization with clear separation of concerns
- Dependency injection container for loose coupling and testability
- Custom decorators for common functionality (authentication, validation, file uploads)
- Global exception filtering for consistent error handling

### Authentication Strategy
- Firebase Authentication for frontend user management
- JWT-based API authentication with role-based access control
- Custom guards for protecting sensitive endpoints
- Role hierarchy: participants, organizers, judges, super admins

### Database Design
- Relational data model with proper foreign key constraints
- Migration-based schema management using Knex.js
- Entity-relationship mapping through Objection.js models
- Optimized queries with eager loading for complex relationships

### API Design Patterns
- RESTful endpoint structure with consistent HTTP methods
- Swagger documentation with comprehensive request/response schemas
- Request validation using class-validator decorators
- Standardized error responses and status codes

### Real-time Features
- WebSocket gateway for live event updates and notifications
- Event-driven architecture for decoupled system components
- Firebase Cloud Messaging for push notifications

### External Service Integration
- Abstracted service layers for third-party integrations
- Configuration management for environment-specific settings
- Retry logic and error handling for external API calls

## Getting Started

### Prerequisites
- Node.js 18+ and Yarn package manager
- MySQL 8.4+ database server
- Firebase project with Authentication enabled
- SendGrid account for email delivery
- Google Cloud Platform project (for GCP services)
- Apple Developer account (for Apple Wallet integration)

### Installation

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd apiv3
yarn install
```

2. Set up the database:
```bash
# Start MySQL with Docker Compose
docker-compose up db -d

# Run database migrations
yarn knex migrate:latest
```

3. Configure environment variables:
```bash
# Copy example environment file
cp .env.example .env

# Configure required variables:
# - Firebase configuration
# - Database connection
# - SendGrid API keys
# - GCP service account
# - Apple certificates
```

4. Start the development server:
```bash
yarn start:dev
```

### Available Scripts
- `yarn start:dev` - Development server with hot reload
- `yarn build` - Build production bundle
- `yarn start:prod` - Run production server
- `yarn test` - Run unit tests
- `yarn test:e2e` - Run end-to-end tests
- `yarn lint` - Lint and fix code style issues
- `yarn format` - Format code with Prettier

### Environment Setup
Configure the following environment variables:
- `DATABASE_URL` - MySQL connection string
- `FIREBASE_CONFIG` - Firebase service account configuration
- `SENDGRID_API_KEY` - SendGrid API key for email delivery
- `GCP_CREDENTIALS` - Google Cloud service account credentials
- `APPLE_CERTIFICATES` - Apple Wallet certificate paths
- `PORT` - Server port (default: 3000)

## Project Structure

```
src/
├── common/                    # Shared modules and utilities
│   ├── apple/                # Apple Wallet integration services
│   ├── config/               # Configuration management
│   ├── gcp/                  # Google Cloud Platform services
│   │   ├── auth/            # Firebase authentication
│   │   ├── firestore/       # Firestore database integration
│   │   ├── messaging/       # Firebase Cloud Messaging
│   │   └── wallet/          # Google Wallet integration
│   ├── objection/           # Database ORM configuration
│   ├── sendgrid/            # Email service integration
│   └── validation/          # Custom validation pipes
├── entities/                 # Database entity models (ORM)
│   ├── user.entity.ts       # User profile and authentication
│   ├── event.entity.ts      # Events and scheduling
│   ├── project.entity.ts    # Hackathon project submissions
│   ├── score.entity.ts      # Judging scores and criteria
│   └── ...                  # Additional domain entities
├── modules/                  # Feature modules (controllers + services)
│   ├── user/                # User management and profiles
│   ├── event/               # Event scheduling and management
│   ├── judging/             # Project evaluation system
│   ├── registration/        # Hackathon registration flow
│   ├── sponsor/             # Sponsor management
│   ├── finance/             # Reimbursement processing
│   ├── inventory/           # Supply and equipment tracking
│   ├── notification/        # Push notifications and alerts
│   ├── analytics/           # Event metrics and reporting
│   └── socket/              # Real-time communication
├── templates/               # Email and document templates
└── main.ts                  # Application bootstrap
db/
├── migrations/              # Database schema migrations
test/                        # End-to-end and integration tests
```

## Key Features

### User Management
- Firebase-based authentication with role management
- Comprehensive user profiles with hackathon-specific fields
- Resume upload and processing for sponsor access
- LinkedIn integration for professional networking

### Event System
- Dynamic event scheduling with location mapping
- QR-code based check-in system for attendance tracking
- Workshop management with presenter information
- Real-time event updates via WebSocket connections

### Judging Platform
- Multi-criteria project evaluation system
- Judge assignment and conflict resolution
- Score aggregation and ranking algorithms
- Real-time judging progress tracking

### Digital Wallet Integration
- Apple Wallet pass generation for event tickets
- Google Pay integration for seamless mobile access
- Dynamic pass updates with event information
- Barcode generation for physical check-ins

### Communication System
- SendGrid-powered email campaigns with MJML templates
- Push notifications via Firebase Cloud Messaging
- Real-time WebSocket updates for live features
- Automated notification workflows

### Administrative Tools
- Comprehensive analytics dashboard
- Finance module for reimbursement processing
- Inventory tracking for hackathon supplies
- Sponsor interaction management

## Deployment

The application is containerized with Docker for consistent deployment across environments:

```bash
# Build production image
docker build --target production -t hackpsu-api .

# Deploy with environment variables
docker run -p 3000:3000 --env-file .env hackpsu-api
```

For production deployment, ensure proper configuration of:
- Database connection pooling
- Firebase service account permissions
- SendGrid domain verification
- Apple Developer certificate provisioning
- Load balancer configuration for WebSocket support

## Contributing

### Code Standards
- TypeScript strict mode enabled for type safety
- ESLint configuration with Prettier integration
- Comprehensive unit test coverage required
- API endpoints must include Swagger documentation
- Database changes require migration files

### Development Workflow
- Feature branches with descriptive naming
- Pull request reviews required for main branch
- Automated testing pipeline with CI/CD integration
- Environment-specific configuration management
- Security review for authentication-related changes

### Architecture Guidelines
- Follow NestJS module structure and dependency injection patterns
- Implement proper error handling with custom exception filters
- Use decorators for cross-cutting concerns (auth, validation, logging)
- Maintain separation between business logic and data access layers
- Design APIs with backward compatibility considerations
