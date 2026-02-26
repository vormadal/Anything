#!/bin/bash

echo "=== Starting Anything ==="

# Start .NET API
echo "Starting .NET API..."
cd /app/api
dotnet Anything.API.dll 2>&1 | sed 's/^/[API] /' &
API_PID=$!

# Start Next.js
echo "Starting Next.js..."
cd /app/frontend
echo "Contents of /app/frontend:"
ls -la /app/frontend/
echo "Node version: $(node --version)"

if [ ! -f server.js ]; then
    echo "ERROR: /app/frontend/server.js not found!"
else
    node server.js &
    NEXT_PID=$!
fi

# Wait briefly for services to start, then check they're alive
sleep 3

if ! kill -0 $API_PID 2>/dev/null; then
    echo "ERROR: .NET API failed to start"
fi

if [ -n "$NEXT_PID" ] && ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "ERROR: Next.js failed to start"
fi

# Start nginx (replaces shell as PID 1)
echo "Starting nginx..."
exec nginx -g 'daemon off;'
