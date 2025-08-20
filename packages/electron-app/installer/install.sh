# Place this next to the `linux-unpacked` folder.

#!/bin/bash
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
FFMPEG_PREBUILT_VERSION=0.101.2
FFMPEG_PREBUILT_URL="https://github.com/nwjs-ffmpeg-prebuilt/nwjs-ffmpeg-prebuilt/releases/download/${FFMPEG_PREBUILT_VERSION}/${FFMPEG_PREBUILT_VERSION}-linux-x64.zip"
APP_DIR="$SCRIPT_DIR/linux-unpacked"
APP_NAME="audioreach-creator-ui"
APP_DISPLAY_NAME="AudioReach Creator"
APP_VERSION="0.0.1"

# Check for required utilities and install if missing
MISSING_PACKAGES=()

if ! command -v curl >/dev/null 2>&1; then
    echo "⚠️  curl not found"
    MISSING_PACKAGES+=("curl")
fi

if ! command -v unzip >/dev/null 2>&1; then
    echo "⚠️  unzip not found"
    MISSING_PACKAGES+=("unzip")
fi

# Install missing packages if any
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "📦 Installing missing packages: ${MISSING_PACKAGES[*]}"
    apt update && apt install -y "${MISSING_PACKAGES[@]}"
else
    echo "✅ Required utilities (curl, unzip) are already installed"
fi

# Check if linux-unpacked directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ linux-unpacked directory not found at: $APP_DIR"
    echo "Make sure this script is in the same directory as linux-unpacked/"
    exit 1
fi

# Check if the executable exists
EXECUTABLE_PATH="$APP_DIR/$APP_NAME"
if [ ! -f "$EXECUTABLE_PATH" ]; then
    echo "❌ Could not find executable: $EXECUTABLE_PATH"
    echo "Available files:"
    ls -la "$APP_DIR"
    exit 1
fi

echo "Downloading Electron FFmpeg..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT



# Download Electron package
curl -L --progress-bar "$FFMPEG_PREBUILT_URL" -o "$TEMP_DIR/ffmpeg-prebuilt.zip"

# Extract the zip file
unzip -q "$TEMP_DIR/ffmpeg-prebuilt.zip" -d "$TEMP_DIR/"

# Find libffmpeg.so in the extracted files
LIBFFMPEG=$(find "$TEMP_DIR" -name "libffmpeg.so" | head -1)

if [ -n "$LIBFFMPEG" ]; then
    cp "$LIBFFMPEG" "$APP_DIR/libffmpeg.so"
    chmod 755 "$APP_DIR/libffmpeg.so"
    echo "✅ Installed FFmpeg from prebuilt v$FFMPEG_PREBUILT_VERSION"
else
    echo "❌ Could not find libffmpeg.so in prebuilt package"
    exit 1
fi

# Verify the installation
if [ -f "$APP_DIR/libffmpeg.so" ]; then
    echo "🎬 FFmpeg is now available for video/audio features!"
    ls -la "$APP_DIR/libffmpeg.so"
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

echo "🔍 Found executable: $APP_NAME"
echo "🚀 Installing $APP_DISPLAY_NAME v$APP_VERSION"

echo "✅ FFmpeg installation completed successfully!"

# Step 1: Copy application to /opt/
echo "📂 Installing application files to /opt/$APP_NAME/"
mkdir -p "/opt/$APP_NAME"
cp -r "$APP_DIR"/* "/opt/$APP_NAME/"
chmod +x "/opt/$APP_NAME/$APP_NAME"

# Step 2: Create launcher script in /usr/bin/
echo "🔗 Creating launcher script..."
cat > "/usr/bin/$APP_NAME" << EOF
#!/bin/bash
exec /opt/$APP_NAME/$APP_NAME "\$@"
EOF
chmod +x "/usr/bin/$APP_NAME"

# Step 3: Create desktop entry
echo "🖥️  Creating desktop entry..."
cat > "/usr/share/applications/$APP_NAME.desktop" << EOF
[Desktop Entry]
Name=$APP_DISPLAY_NAME
Comment=Electron Template using React components
Exec=$APP_NAME %U
Icon=$APP_NAME
Type=Application
Categories=Utility;Development;
StartupNotify=true
StartupWMClass=$APP_NAME
EOF

# Step 4: Install icon (if available)
if [ -f "$SCRIPT_DIR/../libs/icons/512x512.png" ]; then
    echo "🎨 Installing application icon..."
    mkdir -p "/usr/share/pixmaps"
    cp "$SCRIPT_DIR/../libs/icons/512x512.png" "/usr/share/pixmaps/$APP_NAME.png"
elif [ -f "$SCRIPT_DIR/../libs/icon.png" ]; then
    echo "🎨 Installing application icon..."
    mkdir -p "/usr/share/pixmaps"
    cp "$SCRIPT_DIR/../libs/icon.png" "/usr/share/pixmaps/$APP_NAME.png"
else
    echo "⚠️  No icon found - application will use default icon"
fi

# Step 5: Update system databases
echo "🔄 Updating system databases..."

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications
fi

# Update mime database
if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime
fi

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor 2>/dev/null || true
fi

# Step 6: Create uninstall script
echo "🗑️  Creating uninstall script..."
cat > "/opt/$APP_NAME/uninstall.sh" << EOF
#!/bin/bash
set -e

if [ "\$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "🗑️  Uninstalling $APP_DISPLAY_NAME..."

# Kill any running instances
pkill -f "/opt/$APP_NAME/$APP_NAME" || true

# Remove files
rm -f "/usr/bin/$APP_NAME"
rm -f "/usr/share/applications/$APP_NAME.desktop"
rm -f "/usr/share/pixmaps/$APP_NAME.png"
rm -rf "/opt/$APP_NAME"

# Update system databases
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q /usr/share/applications
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor 2>/dev/null || true
fi

echo "✅ $APP_DISPLAY_NAME has been uninstalled"
echo "To reinstall, run: sudo ./install-system.sh"
EOF

chmod +x "/opt/$APP_NAME/uninstall.sh"

# Step 7: Set proper ownership and permissions
chown -R root:root "/opt/$APP_NAME"
find "/opt/$APP_NAME" -type f -name "*.so" -exec chmod 755 {} \;

echo "✅ Installation completed successfully!"
echo ""
echo "📋 Installation Summary:"
echo "   Application: /opt/$APP_NAME/"
echo "   Executable: $APP_NAME"
echo "   Launcher: /usr/bin/$APP_NAME"
echo "   Desktop Entry: /usr/share/applications/$APP_NAME.desktop"
echo "   Uninstaller: /opt/$APP_NAME/uninstall.sh"
echo ""
echo "🚀 You can now launch the app from:"
echo "   • Application menu"
echo "   • Terminal: $APP_NAME"
echo "   • Activities/Search: '$APP_DISPLAY_NAME'"
echo ""
echo "🗑️  To uninstall: sudo /opt/$APP_NAME/uninstall.sh"
