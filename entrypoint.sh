#!/bin/bash

# Start .NET API
cd /app/api
dotnet Anything.API.dll &

# Start Next.js
cd /app/frontend
node server.js &

# Start nginx (replaces shell as PID 1)
exec nginx -g 'daemon off;'
