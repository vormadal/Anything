# Anything - Development Setup Guide

This guide will help you get started with the Anything monorepo project.

## Project Overview

Anything is a monorepo project consisting of:
- **Backend**: .NET 10 Minimal API with PostgreSQL, Entity Framework, Aspire
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Shadcn UI, React Query

## Prerequisites

Make sure you have the following installed:

- **.NET 10 SDK**: [Download here](https://dotnet.microsoft.com/download)
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **PostgreSQL**: [Download here](https://www.postgresql.org/download/) or use Docker
- **Kiota CLI**: Install with `dotnet tool install --global Microsoft.OpenApi.Kiota`

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Anything
```

### 2. Backend Setup

#### Option A: Run with Aspire (Recommended)

Aspire will automatically manage PostgreSQL and other dependencies:

```bash
cd src/Anything.AppHost
dotnet run
```

This will start:
- PostgreSQL container
- Aspire Dashboard (for monitoring)

#### Option B: Run API Standalone

If you prefer to run just the API:

```bash
# Update connection string in appsettings.Development.json
cd src/Anything.API

# Run database migrations
dotnet ef migrations add InitialCreate
dotnet ef database update

# Run the API
dotnet run
```

The API will be available at:
- HTTPS: https://localhost:7000
- HTTP: http://localhost:5000
- Swagger UI: https://localhost:7000/swagger

### 3. Frontend Setup

```bash
cd anything-frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Development Workflow

### Backend Development

#### Adding New Endpoints

Edit `src/Anything.API/Program.cs` to add new minimal API endpoints:

```csharp
app.MapGet("/api/my-endpoint", () => {
    // Your logic here
    return Results.Ok();
});
```

#### Database Changes

```bash
cd src/Anything.API

# Create a new migration
dotnet ef migrations add <MigrationName>

# Apply migration to database
dotnet ef database update

# Remove last migration (if not applied)
dotnet ef migrations remove
```

#### Updating Entity Models

1. Edit models in `src/Anything.API/Data/ApplicationDbContext.cs`
2. Create and apply migration (see above)

### Frontend Development

#### Project Structure

```
anything-frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/
│   │   └── ui/           # Shadcn UI components
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React context providers
│   └── lib/
│       ├── api-client/   # Kiota-generated API client (after generation)
│       └── utils.ts      # Utility functions
├── public/               # Static assets
└── package.json
```

#### Adding Shadcn Components

Since external access is limited, manually add components from the Shadcn documentation:

1. Create component file in `src/components/ui/`
2. Copy component code from [Shadcn UI docs](https://ui.shadcn.com/)
3. Install required dependencies if needed

#### API Client Generation

After making backend changes:

```bash
# Make sure the API is running
cd anything-frontend

# Generate TypeScript client from OpenAPI spec
npm run generate:api
```

This will create/update the API client in `src/lib/api-client/`

#### Using React Query

Example custom hook pattern (see `src/hooks/useTodos.ts`):

```typescript
export function useMyData() {
  return useQuery({
    queryKey: ["myData"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/my-endpoint`);
      return response.json();
    },
  });
}
```

## Environment Variables

### Frontend (.env.local)

Create `anything-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (appsettings.Development.json)

The connection string is automatically configured when using Aspire. For standalone:

```json
{
  "ConnectionStrings": {
    "postgres": "Host=localhost;Database=anything;Username=postgres;Password=yourpassword"
  }
}
```

## Building for Production

### Backend

```bash
cd src/Anything.API
dotnet publish -c Release -o ./publish
```

### Frontend

```bash
cd anything-frontend
npm run build
npm run start  # Runs production build locally
```

## Common Tasks

### Reset Database

```bash
cd src/Anything.API
dotnet ef database drop
dotnet ef database update
```

### View All Endpoints

Run the API and navigate to Swagger UI: https://localhost:7000/swagger

### Debug Frontend API Calls

React Query DevTools are enabled in development mode. Look for the React Query icon in the bottom right of your browser.

## Troubleshooting

### Port Conflicts

If ports 3000, 5000, or 7000 are in use:

**Backend**: Edit `src/Anything.API/Properties/launchSettings.json`
**Frontend**: Use `npm run dev -- -p 3001` to run on a different port

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check connection string in appsettings
3. Ensure user has proper permissions

### CORS Errors

The API is configured to allow localhost:3000. If using a different port, update CORS in `Program.cs`:

```csharp
policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
```

### Kiota Generation Fails

Ensure:
1. API is running
2. Swagger endpoint is accessible
3. OpenAPI spec is valid

## Additional Resources

- [.NET Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [React Query](https://tanstack.com/query/latest)
- [Kiota](https://learn.microsoft.com/en-us/openapi/kiota/)

## Support

For issues or questions, please open an issue on GitHub.
