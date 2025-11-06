#!/bin/bash
# MachineMate Project Cleanup Script
# Removes redundant files and directories

echo "🧹 MachineMate Cleanup Script"
echo "=============================="
echo ""

# Calculate sizes before cleanup
TOTAL_BEFORE=$(du -sh . 2>/dev/null | awk '{print $1}')
echo "📊 Project size before cleanup: $TOTAL_BEFORE"
echo ""

# Function to safely remove directory
safe_remove() {
    if [ -d "$1" ]; then
        SIZE=$(du -sh "$1" 2>/dev/null | awk '{print $1}')
        echo "🗑️  Removing $1 ($SIZE)..."
        rm -rf "$1"
    elif [ -f "$1" ]; then
        echo "🗑️  Removing $1..."
        rm -f "$1"
    else
        echo "⏭️  $1 not found, skipping..."
    fi
}

echo "Removing Python-related files..."
echo "================================"
safe_remove ".venv"
safe_remove ".pycache"
safe_remove "backend"

echo ""
echo "Removing macOS system files..."
echo "=============================="
find . -name ".DS_Store" -type f -exec rm -f {} \;
echo "✅ Removed all .DS_Store files"

echo ""
echo "Removing Expo cache..."
echo "======================"
safe_remove ".expo"

echo ""
echo "Updating .gitignore..."
echo "======================"
# Ensure these are in .gitignore
if ! grep -q "\.DS_Store" .gitignore; then
    echo ".DS_Store" >> .gitignore
    echo "✅ Added .DS_Store to .gitignore"
fi

if ! grep -q "__pycache__" .gitignore; then
    echo "__pycache__/" >> .gitignore
    echo "✅ Added __pycache__/ to .gitignore"
fi

if ! grep -q "\.pycache" .gitignore; then
    echo ".pycache/" >> .gitignore
    echo "✅ Added .pycache/ to .gitignore"
fi

echo ""
echo "=============================="
echo "✅ Cleanup Complete!"
echo "=============================="
echo ""

# Calculate size after cleanup
TOTAL_AFTER=$(du -sh . 2>/dev/null | awk '{print $1}')
echo "📊 Project size after cleanup: $TOTAL_AFTER"
echo ""

echo "What was removed:"
echo "  • Python virtual environment (.venv)"
echo "  • Python cache (.pycache)"
echo "  • Prototype backend (backend/)"
echo "  • macOS system files (.DS_Store)"
echo "  • Expo cache (.expo/)"
echo ""

echo "Note: .expo will be regenerated when you run 'npm start'"
echo ""
