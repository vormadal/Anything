# Stage 1: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-api
WORKDIR /src
COPY Anything.slnx .
COPY src/Anything.API/Anything.API.csproj src/Anything.API/
COPY src/Anything.Application/Anything.Application.csproj src/Anything.Application/
COPY src/Anything.Contracts/Anything.Contracts.csproj src/Anything.Contracts/
COPY src/Anything.Core/Anything.Core.csproj src/Anything.Core/
COPY src/Anything.Database/Anything.Database.csproj src/Anything.Database/
COPY src/Anything.Mediator/Anything.Mediator.csproj src/Anything.Mediator/
COPY src/Anything.ServiceDefaults/Anything.ServiceDefaults.csproj src/Anything.ServiceDefaults/
RUN dotnet restore src/Anything.API/Anything.API.csproj
COPY src/ src/
RUN dotnet publish src/Anything.API/Anything.API.csproj -c Release -o /app/api --no-restore

# Stage 2: Build Next.js frontend
FROM node:22-alpine AS build-frontend
WORKDIR /app
COPY anything-frontend/package.json anything-frontend/package-lock.json ./
RUN npm ci
COPY anything-frontend/ .
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs nginx libgssapi-krb5-2 \
    && apt-get purge -y curl gnupg \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy API
WORKDIR /app/api
COPY --from=build-api /app/api .

# Copy frontend
WORKDIR /app/frontend
COPY --from=build-frontend /app/.next/standalone ./
COPY --from=build-frontend /app/.next/static ./.next/static
COPY --from=build-frontend /app/public ./public

# Copy nginx config and entrypoint
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV ASPNETCORE_HTTP_PORTS=5000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
