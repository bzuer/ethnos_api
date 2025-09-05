#!/bin/bash

set -e

SCRIPT_DIR="$(dirname "$0")"
API_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$API_DIR/ssl"
ENV_FILE="$API_DIR/.env"

check_certificates() {
    if [ -f "$SSL_DIR/ethnos-api-cert.pem" ] && \
       [ -f "$SSL_DIR/ethnos-api-key.pem" ] && \
       [ -f "$SSL_DIR/mysql-client-cert.pem" ] && \
       [ -f "$SSL_DIR/mysql-server-cert.pem" ]; then
        return 0
    else
        return 1
    fi
}

enable_ssl() {
    echo "Enabling SSL/TLS for ethnos.app API..."
    
    if ! check_certificates; then
        echo "✗ SSL certificates not found. Run 'regenerate' first."
        exit 1
    fi
    
    # Update .env file
    sed -i 's/DB_SSL=false/DB_SSL=true/' "$ENV_FILE"
    sed -i 's/ENABLE_HTTPS=false/ENABLE_HTTPS=true/' "$ENV_FILE"
    
    echo "✓ SSL enabled in configuration"
    echo "  - Database connections will use SSL"
    echo "  - API will serve HTTPS on port 3443"
    echo "  - Restart the server to apply changes"
}

disable_ssl() {
    echo "Disabling SSL/TLS for ethnos.app API..."
    
    # Update .env file
    sed -i 's/DB_SSL=true/DB_SSL=false/' "$ENV_FILE"
    sed -i 's/ENABLE_HTTPS=true/ENABLE_HTTPS=false/' "$ENV_FILE"
    
    echo "✓ SSL disabled in configuration"
    echo "  - Database connections will use plain connection"
    echo "  - API will serve HTTP only on port 3000"
    echo "  - Restart the server to apply changes"
}

regenerate_certificates() {
    echo "Regenerating SSL certificates..."
    
    mkdir -p "$SSL_DIR"
    cd "$SSL_DIR"
    
    # API certificates
    echo "Creating API certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout ethnos-api-key.pem -out ethnos-api-cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=Ethnos/CN=localhost"
    
    # MySQL certificates
    echo "Creating MySQL certificates..."
    openssl req -x509 -newkey rsa:2048 -keyout mysql-server-key.pem -out mysql-server-cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=Ethnos/CN=mysql-server"
    
    openssl req -newkey rsa:2048 -keyout mysql-client-key.pem -out mysql-client-req.pem -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=Ethnos/CN=mysql-client"
    
    openssl x509 -req -in mysql-client-req.pem -CA mysql-server-cert.pem -CAkey mysql-server-key.pem -out mysql-client-cert.pem -days 365 -CAcreateserial
    
    # Sphinx certificates
    echo "Creating Sphinx certificates..."
    openssl req -x509 -newkey rsa:2048 -keyout sphinx-server-key.pem -out sphinx-server-cert.pem -days 365 -nodes -subj "/C=BR/ST=SP/L=SaoPaulo/O=Ethnos/CN=sphinx-server"
    
    # Set proper permissions
    chmod 600 *key.pem
    chmod 644 *cert.pem
    
    echo "✓ SSL certificates regenerated"
    echo "  - API certificates: ethnos-api-*.pem"
    echo "  - MySQL certificates: mysql-*.pem"
    echo "  - Sphinx certificates: sphinx-*.pem"
}

show_status() {
    echo "=== SSL/TLS Status ==="
    echo
    
    # Check certificates
    if check_certificates; then
        echo "✓ SSL certificates: Available"
        
        # Show certificate info
        echo "  - API cert expires: $(openssl x509 -enddate -noout -in "$SSL_DIR/ethnos-api-cert.pem" | cut -d= -f2)"
        echo "  - MySQL cert expires: $(openssl x509 -enddate -noout -in "$SSL_DIR/mysql-server-cert.pem" | cut -d= -f2)"
    else
        echo "✗ SSL certificates: Missing"
    fi
    
    # Check configuration
    if grep -q "DB_SSL=true" "$ENV_FILE"; then
        echo "✓ Database SSL: Enabled"
    else
        echo "○ Database SSL: Disabled"
    fi
    
    if grep -q "ENABLE_HTTPS=true" "$ENV_FILE"; then
        echo "✓ API HTTPS: Enabled (port 3443)"
    else
        echo "○ API HTTPS: Disabled (HTTP only)"
    fi
    
    echo
    echo "Certificate files:"
    if [ -d "$SSL_DIR" ]; then
        ls -la "$SSL_DIR"/*.pem 2>/dev/null | while read line; do
            echo "  $line"
        done
    else
        echo "  No certificates found"
    fi
}

test_ssl() {
    echo "=== Testing SSL Connections ==="
    echo
    
    # Test API HTTPS (if enabled)
    if grep -q "ENABLE_HTTPS=true" "$ENV_FILE"; then
        echo "Testing HTTPS API connection..."
        if curl -k -s https://localhost:3443/health > /dev/null 2>&1; then
            echo "✓ HTTPS API: Working"
        else
            echo "✗ HTTPS API: Failed"
        fi
    fi
    
    # Test MySQL SSL (if enabled)
    if grep -q "DB_SSL=true" "$ENV_FILE"; then
        echo "Testing MySQL SSL connection..."
        # This would need actual testing logic
        echo "○ MySQL SSL: Configuration enabled (manual test required)"
    fi
    
    echo "✓ SSL tests completed"
}

case "$1" in
    enable)
        enable_ssl
        ;;
    disable)
        disable_ssl
        ;;
    regenerate)
        regenerate_certificates
        ;;
    status)
        show_status
        ;;
    test)
        test_ssl
        ;;
    *)
        echo "SSL Manager for ethnos.app API"
        echo
        echo "Usage: $0 {enable|disable|regenerate|status|test}"
        echo
        echo "Commands:"
        echo "  enable      - Enable SSL/TLS for API and database"
        echo "  disable     - Disable SSL/TLS connections"
        echo "  regenerate  - Create new SSL certificates"
        echo "  status      - Show current SSL status"
        echo "  test        - Test SSL connections"
        echo
        exit 1
        ;;
esac

exit 0