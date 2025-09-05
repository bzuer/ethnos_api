#!/bin/bash

set -e

echo "=== Configuring Sphinx Security ==="

echo "Activating firewall..."
ufw --force enable

echo "Configuring firewall rules for port 9306..."
ufw deny 9306
ufw allow from 127.0.0.1 to any port 9306
ufw allow from localhost to any port 9306

# Enable UFW logging
ufw logging on

# Validate configuration
echo "Validating firewall configuration..."
ufw status | grep 9306 || echo "No explicit rules found (default deny active)"

echo "=== Sphinx Security Configuration Complete ==="

# Test connectivity
echo "Testing Sphinx connectivity..."
if timeout 3 mysql -h127.0.0.1 -P9306 -e "SHOW STATUS" >/dev/null 2>&1; then
    echo "✅ Local Sphinx connectivity: SUCCESS"
else
    echo "❌ Local Sphinx connectivity: FAILED"
    exit 1
fi

echo "Security setup completed successfully"