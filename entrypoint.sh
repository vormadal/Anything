#!/bin/bash
# Runs the .NET API, Next.js and nginx side by side. If any of them exits, the
# container exits too, so the orchestrator (CapRover / Docker Swarm) restarts it.
# Previously nginx was exec'd as PID 1, which kept the container "healthy" while
# the API was dead and every /api/* request failed with "Connection refused".

echo "=== Starting Anything ==="

PIDS=()

shutdown() {
    echo "Stopping all processes..."
    kill -TERM "${PIDS[@]}" 2>/dev/null
    wait
}

# Forward docker stop / swarm restarts to the children instead of dropping them.
trap 'shutdown; exit 143' TERM INT

# Start .NET API (process substitution keeps dotnet's PID in $! instead of sed's)
echo "Starting .NET API..."
cd /app/api
dotnet Anything.API.dll > >(sed 's/^/[API] /') 2>&1 &
API_PID=$!
PIDS+=("$API_PID")

# Start Next.js
echo "Starting Next.js..."
cd /app/frontend
echo "Node version: $(node --version)"

if [ ! -f server.js ]; then
    echo "ERROR: /app/frontend/server.js not found!"
    shutdown
    exit 1
fi
node server.js &
NEXT_PID=$!
PIDS+=("$NEXT_PID")

# Wait for API to be ready (up to 60 seconds to allow for migration retries)
echo "Waiting for .NET API to be ready..."
for i in $(seq 1 60); do
    if ! kill -0 "$API_PID" 2>/dev/null; then
        echo "ERROR: .NET API process exited during startup"
        shutdown
        exit 1
    fi
    if (echo > /dev/tcp/localhost/5000) 2>/dev/null; then
        echo ".NET API is ready"
        break
    fi
    sleep 1
done

echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
PIDS+=("$NGINX_PID")

# Block until the first of the three exits, then take the others down with it.
wait -n "${PIDS[@]}"
STATUS=$?

for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
        case "$pid" in
            "$API_PID") name=".NET API" ;;
            "$NEXT_PID") name="Next.js" ;;
            "$NGINX_PID") name="nginx" ;;
        esac
        echo "ERROR: $name exited (status $STATUS); stopping container"
    fi
done

shutdown
# A service stopping is never expected, so never report success.
[ "$STATUS" -eq 0 ] && STATUS=1
exit "$STATUS"
