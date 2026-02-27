#!/bin/bash

echo "=== Starting Anything ==="

# Start .NET API (process substitution keeps dotnet's PID in $! instead of sed's)
echo "Starting .NET API..."
cd /app/api
dotnet Anything.API.dll > >(sed 's/^/[API] /') 2>&1 &
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

# Wait for API to be ready (up to 60 seconds to allow for migration retries)
echo "Waiting for .NET API to be ready..."
for i in $(seq 1 60); do
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "ERROR: .NET API process exited unexpectedly"
        break
    fi
    if (echo > /dev/tcp/localhost/5000) 2>/dev/null; then
        echo ".NET API is ready"
        break
    fi
    sleep 1
done

if [ -n "$NEXT_PID" ] && ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "ERROR: Next.js failed to start"
fi

# Start nginx (replaces shell as PID 1)
echo "Starting nginx..."
exec nginx -g 'daemon off;'
