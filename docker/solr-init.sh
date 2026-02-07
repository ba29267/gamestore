#!/bin/bash

# Wait for Solr to be ready
echo "Waiting for Solr to start..."
for i in {1..30}; do
  curl -s http://localhost:8983/solr/admin/ping > /dev/null && break
  echo "Attempt $i/30: Waiting for Solr..."
  sleep 1
done

# Create games core
echo "Creating games core..."
curl -X POST http://localhost:8983/api/cores?action=CREATE&name=games&configSet=_default

# Wait a moment for core creation
sleep 2

# Add fields to games core
echo "Adding fields to games core..."

# Delete existing fields (if any)
curl -X POST http://localhost:8983/solr/games/schema -H "Content-Type: application/json" -d '{
  "delete-field": { "name": "title" }
}' 2>/dev/null || true

# Create fields
curl -X POST http://localhost:8983/solr/games/schema -H "Content-Type: application/json" -d '{
  "add-field": [
    { "name": "id", "type": "pint", "indexed": true, "stored": true, "required": true },
    { "name": "title", "type": "text_general", "indexed": true, "stored": true },
    { "name": "genre", "type": "string", "indexed": true, "stored": true },
    { "name": "platform", "type": "string", "indexed": true, "stored": true },
    { "name": "price", "type": "pfloat", "indexed": true, "stored": true },
    { "name": "rating", "type": "pfloat", "indexed": true, "stored": true },
    { "name": "description", "type": "text_general", "indexed": true, "stored": true }
  ]
}'

echo "✓ Solr-games core initialized successfully"
