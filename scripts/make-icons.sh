#!/bin/sh
# Generates PWA icons from design/app-icon-1024.png (macOS, uses sips).
# The outputs are committed, so normal builds do not run this script.
set -e
cd "$(dirname "$0")/.."
src=design/app-icon-1024.png
out=public/icons
mkdir -p "$out"
sips -z 512 512 "$src" --out "$out/icon-512.png" >/dev/null
sips -z 192 192 "$src" --out "$out/icon-192.png" >/dev/null
sips -z 180 180 "$src" --out "$out/apple-touch-icon.png" >/dev/null
sips -z 32 32 "$src" --out "$out/favicon-32.png" >/dev/null
# Maskable: shrink the artwork into the 80 % safe zone on the icon's graphite.
sips -z 432 432 "$src" --out /tmp/motion-maskable.png >/dev/null
sips --padToHeightWidth 512 512 --padColor 13171B /tmp/motion-maskable.png --out "$out/icon-maskable-512.png" >/dev/null
rm /tmp/motion-maskable.png
