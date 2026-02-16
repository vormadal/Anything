# Anything

[![Backend CI](https://github.com/vormadal/Anything/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/vormadal/Anything/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/vormadal/Anything/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/vormadal/Anything/actions/workflows/frontend-ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vormadal_Anything&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vormadal_Anything)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vormadal_Anything&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vormadal_Anything)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vormadal_Anything&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vormadal_Anything)

Create "Something", it can be anything: checklist, grocery shopping list, inventory in your storage room or keep track on subscriptions and other expenses.

## Project Structure

This is a monorepo containing:

- **Backend**: .NET 10 API with Minimal API, PostgreSQL, Entity Framework, and Aspire
- **Frontend**: Next.js app with Tailwind CSS, Shadcn UI, and React Query

### Backend (`src/`)

- **Anything.API**: Minimal API project with OpenAPI/Swagger support
- **Anything.AppHost**: Aspire orchestrator for managing services
- **Anything.ServiceDefaults**: Shared service configurations (OpenTelemetry, health checks, etc.)

### Frontend (`anything-frontend/`)

- Next.js 15 with App Router
- Tailwind CSS for styling
- Shadcn UI components
- React Query (@tanstack/react-query) for state management
- Custom hooks for API interactions
- Kiota for API client generation

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js 18+ and npm
- PostgreSQL (or use Docker with Aspire)

### Authentication Setup

The application uses JWT bearer token authentication. On first run, a default administrator account is automatically created.

**Default Admin Credentials:**
- Email: `admin@anything.local`
- Password: `Admin123!`

**IMPORTANT:** Change these default credentials in production by updating the `appsettings.json` file:

```json
{
  "Admin": {
    "Email": "your-admin@example.com",
    "Password": "YourSecurePassword!"
  },
  "Jwt": {
    "SecretKey": "your-secret-key-min-32-characters-long-change-in-production",
    "Issuer": "Anything.API",
    "Audience": "Anything.Frontend",
    "AccessTokenExpirationMinutes": "15"
  }
}
```

**User Invitations:**
- Only administrators can invite new users
- Navigate to the Admin Panel after logging in as admin
- Enter the new user's email address to generate an invite link
- Copy and send the invite link to the user manually
- Invite links expire after 7 days
- The invited user must use the same email address when registering

### Running the Backend

```bash
# Navigate to the solution root
cd /path/to/Anything

# Build the solution
dotnet build

# Run with Aspire (recommended)
cd src/Anything.AppHost
dotnet run

# Or run the API directly
cd src/Anything.API
dotnet run
```

The API will be available at:
- https://localhost:7000 (or check the console output)
- Swagger UI: https://localhost:7000/swagger

### Running the Frontend

```bash
# Navigate to the frontend directory
cd anything-frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at http://localhost:3000

### Database Migrations

```bash
# Navigate to the API project
cd src/Anything.API

# Create a migration
dotnet ef migrations add InitialCreate

# Apply migrations
dotnet ef database update
```

## API Client Generation with Kiota

To generate the API client for the frontend:

```bash
# Make sure the API is running and generating OpenAPI spec
# Then from the frontend directory:
cd anything-frontend

# Generate the client (example)
kiota generate \
  --language typescript \
  --class-name ApiClient \
  --namespace-name ApiClient \
  --openapi http://localhost:5000/swagger/v1/swagger.json \
  --output src/lib/api-client
```

## Architecture

### Backend Stack

- **.NET 10**: Latest .NET version
- **Minimal API**: Lightweight, high-performance API endpoints
- **Entity Framework Core**: ORM for PostgreSQL
- **Aspire**: Cloud-native orchestration and observability
- **OpenAPI/Swagger**: API documentation and client generation
- **PostgreSQL**: Relational database
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **BCrypt**: Password hashing for secure credential storage

### Authentication Flow

1. **Login**: Users authenticate with email/password to receive access and refresh tokens
2. **Access Token**: Short-lived JWT (15 minutes) for API authorization
3. **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens
4. **Protected Endpoints**: All API endpoints require valid JWT bearer token
5. **User Roles**: Admin and User roles with role-based access control
6. **Invite System**: Admin-only invite creation with email-linked tokens

### Frontend Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Beautiful, accessible component library
- **React Query**: Server state management
- **Kiota**: OpenAPI-based API client generator

## Development

### Backend Development

The backend follows clean architecture principles with:
- Minimal API endpoints in `Program.cs`
- Entity models and DbContext in the `Data` folder
- Service defaults for cross-cutting concerns

### Frontend Development

The frontend is organized as:
- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable React components
  - `src/components/ui/`: Shadcn UI components
- `src/hooks/`: Custom React hooks
- `src/context/`: React context providers
- `src/lib/`: Utility functions and API clients

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The pipeline includes:

- **Backend CI**: Build, test, and SonarCloud analysis for .NET code
- **Frontend CI**: Lint, build, and SonarCloud analysis for Next.js code
- **Code Coverage**: Automated coverage reports for both backend and frontend
- **Quality Gates**: SonarCloud quality gates ensure code quality standards

For detailed CI/CD documentation, setup instructions, and best practices, see [CI-CD.md](CI-CD.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
