#!/bin/bash
# Color codes for clean console styling
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill all background processes started by this script on Ctrl+C (SIGINT / exit)
trap "echo -e '\n🛑 Stopping Kagi Workstation services...'; kill 0" EXIT

echo -e "${BLUE}========================================================${NC}"
echo -e "${GREEN}         KAGI TRADING WORKSTATION — LOCAL LAUNCH        ${NC}"
echo -e "${BLUE}========================================================${NC}"

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: 'python3' is not installed on your system.${NC}"
    echo -e "Please install Python 3 and try again."
    exit 1
fi

# Verify if pip and venv python packages are available
HAS_PIP=true
HAS_VENV=true

if ! python3 -c "import pip" &> /dev/null; then
    HAS_PIP=false
fi

if ! python3 -c "import venv" &> /dev/null; then
    HAS_VENV=false
fi

if [ "$HAS_PIP" = false ] || [ "$HAS_VENV" = false ]; then
    echo -e "${RED}❌ Error: Missing required Python tools (pip / venv).${NC}"
    echo -e "Your system's Python installation lacks 'pip' or 'venv'."
    echo -e "To fix this, please run the following command in your terminal first:\n"
    echo -e "    ${GREEN}sudo apt update && sudo apt install -y python3-pip python3-venv${NC}\n"
    echo -e "Once installed, run ${BLUE}npm start${NC} again to boot the application."
    exit 1
fi

# 1. Setup Python environment and install dependencies if needed
if [ -d "backend" ]; then
    echo -e "📦 Setting up Python environment..."
    
    # Clean up corrupt/incomplete virtual environments from prior failed attempts
    if [ -d "backend/venv" ] && [ ! -f "backend/venv/bin/activate" ]; then
        echo -e "🧹 Cleaning up incomplete virtual environment..."
        rm -rf backend/venv
    fi
    
    # Try to use virtual environment
    if [ ! -d "backend/venv" ]; then
        echo -e "⚙️ Creating virtual environment at backend/venv..."
        python3 -m venv backend/venv
    fi
    
    if [ -d "backend/venv" ] && [ -f "backend/venv/bin/activate" ]; then
        echo -e "🔌 Activating virtual environment..."
        source backend/venv/bin/activate
        echo -e "📥 Installing/verifying requirements inside virtual environment..."
        pip install --upgrade pip
        pip install -r backend/requirements.txt
    else
        echo -e "⚠️ Virtual environment creation skipped/failed. Installing dependencies globally..."
        pip install -r backend/requirements.txt --break-system-packages
    fi
    
    echo -e "🐍 Starting Python Backend..."
    # Run backend from within the backend directory to ensure correct import paths
    (cd backend && python3 main.py) &
else
    echo -e "${RED}Error: 'backend' directory not found.${NC}"
    exit 1
fi

# Wait briefly for database initialization & port binding
echo -e "⏳ Waiting for backend to bind to port 8000..."
sleep 4

# 2. Start Frontend Vite
if [ -d "node_modules" ]; then
    echo -e "⚡ Starting Vite Frontend..."
    npm run dev
else
    echo -e "${RED}Error: 'node_modules' not found. Installing dependencies first...${NC}"
    npm install
    echo -e "⚡ Starting Vite Frontend..."
    npm run dev
fi

# Keep script running to maintain logs and wait for exit trap
wait
