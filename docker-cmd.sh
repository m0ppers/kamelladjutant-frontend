#!/bin/sh

echo "var backendUri = '$BACKEND_URI';\n" > /var/www/html/backend-config.js
nginx
