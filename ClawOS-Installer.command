#!/bin/bash
# ClawOS-Installer.command — Double-click this file on macOS to install ClawOS
# It downloads and runs the latest setup script from GitHub.

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     ClawOS One-Click Installer       ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  This will install ClawOS to ~/Projects/clawos"
echo "  Press Ctrl+C within 5 seconds to cancel..."
echo ""
sleep 5

SETUP_URL="https://raw.githubusercontent.com/Yaircohenh/openclaw/main/setup-clawos.sh"

# Download and run the installer
curl -fsSL "$SETUP_URL" -o /tmp/setup-clawos.sh
if [ $? -ne 0 ]; then
  echo ""
  echo "  ERROR: Could not download the installer."
  echo "  Check your internet connection and try again."
  echo ""
  echo "  Press Enter to close..."
  read -r
  exit 1
fi

bash /tmp/setup-clawos.sh
EXIT_CODE=$?
rm -f /tmp/setup-clawos.sh

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "  Installation complete! You can close this window."
else
  echo "  Installation failed. Scroll up to see the error."
fi
echo ""
echo "  Press Enter to close..."
read -r
