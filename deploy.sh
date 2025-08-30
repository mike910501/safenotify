#!/bin/bash

# SafeNotify Production Deployment Script
# Enhanced Bulk Messaging System with Queue & Real-time Progress

echo "🚀 SafeNotify Production Deployment"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking environment configuration...${NC}"

# Check if .env.production exists
if [ ! -f "backend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating from template...${NC}"
    cp backend/.env.production.example backend/.env.production
    echo -e "${RED}❌ Please configure backend/.env.production with your production values${NC}"
    echo -e "${YELLOW}📝 Edit the file and run this script again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration found${NC}"

# Build and deploy
echo -e "${BLUE}🏗️  Building Docker containers...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down

# Start production deployment
echo -e "${BLUE}🚀 Starting production deployment...${NC}"
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check health
echo -e "${BLUE}🩺 Checking service health...${NC}"

# Check Redis
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: HEALTHY${NC}"
else
    echo -e "${RED}❌ Redis: UNHEALTHY${NC}"
fi

# Check Backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: HEALTHY${NC}"
else
    echo -e "${RED}❌ Backend API: UNHEALTHY${NC}"
fi

# Show status
echo -e "${BLUE}📊 Deployment Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}🎉 SafeNotify Enhanced System Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}🔗 System Features:${NC}"
echo -e "   ✅ Enhanced Bull Queue System"
echo -e "   ✅ Real-time WebSocket Progress Tracking"  
echo -e "   ✅ Rate Limiting with Intelligent Retries"
echo -e "   ✅ Priority-based Job Processing"
echo -e "   ✅ Redis-backed Queue Management"
echo -e "   ✅ Comprehensive Error Handling"
echo ""
echo -e "${BLUE}📡 Endpoints:${NC}"
echo -e "   🌐 Backend API: http://localhost:3001"
echo -e "   📊 Health Check: http://localhost:3001/health"
echo -e "   🔌 WebSocket: ws://localhost:3001"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "   📋 View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo -e "   📈 Monitor: docker stats"
echo -e "   🛑 Stop: docker-compose -f docker-compose.prod.yml down"
echo -e "   🔄 Restart: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo -e "${GREEN}✨ Production deployment completed successfully!${NC}"