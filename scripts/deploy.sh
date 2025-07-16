#!/bin/bash

# Deployment script for PromptLibrary MVP
# This script handles the deployment process to Firebase

set -e

echo "🚀 Starting PromptLibrary MVP Deployment"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Set environment (default to development)
ENVIRONMENT=${1:-development}
echo "📦 Deploying to environment: $ENVIRONMENT"

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm ci

# Build the project
echo "🔨 Building frontend..."
npm run build

# Navigate back to root
cd ..

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
case $ENVIRONMENT in
    "production")
        firebase use production
        firebase deploy --only hosting,firestore,functions,storage
        ;;
    "staging")
        firebase use staging
        firebase deploy --only hosting,firestore,functions,storage
        ;;
    *)
        firebase use development
        firebase deploy --only hosting,firestore,functions,storage
        ;;
esac

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is now live!"

# Display URLs
case $ENVIRONMENT in
    "production")
        echo "Production URL: https://prompt-library-prod.web.app"
        ;;
    "staging")
        echo "Staging URL: https://prompt-library-staging.web.app"
        ;;
    *)
        echo "Development URL: https://prompt-library-dev.web.app"
        ;;
esac

echo ""
echo "📊 Next steps:"
echo "1. Test the deployed application"
echo "2. Monitor Firebase console for any issues"
echo "3. Set up monitoring and alerts"
echo "4. Collect user feedback"
echo ""
echo "🎉 Happy prompting!"
