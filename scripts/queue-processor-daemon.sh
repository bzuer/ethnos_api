#!/bin/bash

# Queue Processor Daemon - runs continuously, not every minute
# This replaces the problematic cron job that was creating hundreds of processes

SCRIPT_DIR="/home/server/api_v2"
PIDFILE="$SCRIPT_DIR/logs/queue-processor.pid"
LOGFILE="$SCRIPT_DIR/logs/queue-processor.log"

cd "$SCRIPT_DIR"

# Check if already running
if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
    echo "Queue processor already running with PID $(cat $PIDFILE)"
    exit 1
fi

# Start the processor
echo "Starting queue processor daemon..."
nohup /usr/bin/node scripts/queue-processor.js >> "$LOGFILE" 2>&1 &
PID=$!

# Save PID
echo $PID > "$PIDFILE"
echo "Queue processor started with PID $PID"

# Clean up PID file on exit
trap "rm -f $PIDFILE" EXIT