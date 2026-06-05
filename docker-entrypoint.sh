#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy

echo "Starting clearvote..."
exec node server.js
