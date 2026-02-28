#!/usr/bin/env bash
#
# luckydrop.sh — start / stop / restart / status for LuckyDrop server
#
# Usage:
#   ./luckydrop.sh start    Start the production server in the background (auto-builds if needed)
#   ./luckydrop.sh dev      Start the dev server in the background (no build needed)
#   ./luckydrop.sh stop     Stop the running server
#   ./luckydrop.sh restart  Stop then start (production)
#   ./luckydrop.sh status   Show whether the server is running
#   ./luckydrop.sh logs     Tail the log file
#   ./luckydrop.sh build    Build for production

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$DIR/.luckydrop.pid"
LOGFILE="$DIR/.luckydrop.log"
PORT="${PORT:-3000}"
HOST="${HOST:-$(hostname)}"

is_running() {
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

cmd_start() {
  if is_running; then
    echo "LuckyDrop is already running (PID $(cat "$PIDFILE"))"
    exit 0
  fi

  cd "$DIR"

  # Build if no production build exists
  if [ ! -f "$DIR/.next/BUILD_ID" ]; then
    echo "No production build found. Building..."
    npx next build
    echo ""
  fi

  echo "Starting LuckyDrop on port $PORT..."
  NODE_ENV=production PORT="$PORT" nohup npx tsx server.ts > "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 2

  if is_running; then
    echo "LuckyDrop started (PID $(cat "$PIDFILE"))"
    echo "  Display:  http://$HOST:$PORT/"
    echo "  Join:     http://$HOST:$PORT/join"
    echo "  Operator: http://$HOST:$PORT/operator"
    echo "  Logs:     $LOGFILE"
  else
    echo "Failed to start. Check logs:"
    tail -20 "$LOGFILE"
    rm -f "$PIDFILE"
    exit 1
  fi
}

cmd_stop() {
  if ! is_running; then
    echo "LuckyDrop is not running"
    rm -f "$PIDFILE"
    exit 0
  fi

  local pid
  pid=$(cat "$PIDFILE")
  echo "Stopping LuckyDrop (PID $pid)..."
  kill "$pid" 2>/dev/null || true
  # Wait up to 5 seconds for graceful shutdown
  for i in $(seq 1 10); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.5
  done
  # Force kill if still alive
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
  echo "LuckyDrop stopped"
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  if is_running; then
    echo "LuckyDrop is running (PID $(cat "$PIDFILE")) on port $PORT"
  else
    echo "LuckyDrop is not running"
    rm -f "$PIDFILE"
  fi
}

cmd_dev() {
  if is_running; then
    echo "LuckyDrop is already running (PID $(cat "$PIDFILE"))"
    exit 0
  fi

  cd "$DIR"
  echo "Starting LuckyDrop in dev mode on port $PORT..."
  PORT="$PORT" nohup npx tsx server.ts > "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 3

  if is_running; then
    echo "LuckyDrop dev started (PID $(cat "$PIDFILE"))"
    echo "  Display:  http://$HOST:$PORT/"
    echo "  Join:     http://$HOST:$PORT/join"
    echo "  Operator: http://$HOST:$PORT/operator"
    echo "  Logs:     $LOGFILE"
  else
    echo "Failed to start. Check logs:"
    tail -20 "$LOGFILE"
    rm -f "$PIDFILE"
    exit 1
  fi
}

cmd_build() {
  cd "$DIR"
  echo "Building LuckyDrop..."
  npx next build
  echo "Build complete."
}

cmd_logs() {
  if [ ! -f "$LOGFILE" ]; then
    echo "No log file found"
    exit 1
  fi
  tail -f "$LOGFILE"
}

case "${1:-}" in
  start)   cmd_start   ;;
  dev)     cmd_dev     ;;
  stop)    cmd_stop    ;;
  restart) cmd_restart ;;
  status)  cmd_status  ;;
  logs)    cmd_logs    ;;
  build)   cmd_build   ;;
  *)
    echo "Usage: $0 {start|dev|stop|restart|status|logs|build}"
    exit 1
    ;;
esac
