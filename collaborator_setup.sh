#!/bin/bash

echo "🚀 Setting up Gurukul V1 Development Environment for Collaboration"
echo "=================================================================="

# Create main project directory
mkdir -p ~/V1Gurukul
cd ~/V1Gurukul

echo "📁 Created main directory: ~/V1Gurukul"

# Clone backend repository
echo "⬇️  Cloning backend repository..."
git clone https://github.com/gurukulai/gurukul-v1-backend.git
cd gurukul-v1-backend

echo "📦 Installing backend dependencies..."
npm install

echo "✅ Backend setup complete!"
cd ..

# Clone frontend repository
echo "⬇️  Cloning frontend repository..."
git clone https://github.com/raghavg93/gurukul-v1-frontend.git
cd gurukul-v1-frontend

echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"
cd ..

echo ""
echo "🎉 Setup Complete! Your directory structure:"
echo "~/V1Gurukul/"
echo "├── gurukul-v1-backend/     (NestJS API)"
echo "└── gurukul-v1-frontend/    (React Chat App)"
echo ""
echo "🔧 To start development:"
echo "Backend:  cd ~/V1Gurukul/gurukul-v1-backend && npm run start:dev"
echo "Frontend: cd ~/V1Gurukul/gurukul-v1-frontend && npm start"
echo ""
echo "📚 Check IMPROVING_PRIYA.md in backend for recent changes!" 