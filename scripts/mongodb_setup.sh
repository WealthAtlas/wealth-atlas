#!/bin/bash

# MongoDB Atlas Setup Script
# This script helps create initial database collections in MongoDB Atlas

echo "MongoDB Atlas Database Setup"
echo "==========================="
echo ""

# Verify MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "Error: MONGODB_URI environment variable is not set."
    echo "Please set it using: export MONGODB_URI='mongodb+srv://...' before running this script."
    exit 1
fi

# Extract database name from URI
DB_NAME=$(echo $MONGODB_URI | sed -n 's|.*\/\([^?]*\).*|\1|p')
if [ -z "$DB_NAME" ]; then
    echo "Could not extract database name from URI. Using 'wealth-atlas' as default."
    DB_NAME="wealth-atlas"
fi

echo "Setting up database: $DB_NAME"
echo ""

# Create collections for WealthAtlas application
echo "Creating collections..."

collections=(
    "assets"
    "expenses"
    "goals"
    "investments" 
    "sips"
    "users"
)

for collection in "${collections[@]}"; do
    echo "Creating $collection collection..."
    mongosh "$MONGODB_URI" --eval "db.createCollection('$collection')" --quiet
done

echo ""
echo "Creating indexes..."

# Create indexes for better performance
mongosh "$MONGODB_URI" --eval '
db.users.createIndex({ "email": 1 }, { unique: true });
db.assets.createIndex({ "userId": 1 });
db.expenses.createIndex({ "userId": 1 });
db.expenses.createIndex({ "date": 1 });
db.goals.createIndex({ "userId": 1 });
db.investments.createIndex({ "assetId": 1 });
db.sips.createIndex({ "userId": 1 });
' --quiet

echo ""
echo "Database setup complete!"
echo ""
echo "You can now configure your application with the following MongoDB URI:"
echo "MONGODB_URI=$MONGODB_URI"
echo ""
echo "Remember to add this to your Terraform variables or GitHub Secrets."
