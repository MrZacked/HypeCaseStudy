#!/bin/bash

echo "Testing production build..."

# Build the project
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Test with serve
    if command -v serve &> /dev/null; then
        echo "Starting production server..."
        serve -s build -l 3001 &
        SERVER_PID=$!
        
        echo "Production build running at http://localhost:3001"
        echo "Press Ctrl+C to stop"
        
        # Wait for interrupt
        trap "kill $SERVER_PID" INT
        wait $SERVER_PID
    else
        echo "Install serve globally: npm install -g serve"
        echo "Then run: serve -s build"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi