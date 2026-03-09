#!/bin/bash
# Compress all images in a folder for Claude Code context efficiency.
# Uses macOS built-in sips — no dependencies needed.
#
# Usage:
#   ./compress_screenshots.sh /path/to/folder
#   ./compress_screenshots.sh /path/to/folder 600    # custom max width
#
# Output: creates /path/to/folder/compressed/ with resized JPEGs

FOLDER="${1:-.}"
MAX_WIDTH="${2:-800}"
OUTPUT_DIR="$FOLDER/compressed"

mkdir -p "$OUTPUT_DIR"

count=0
shopt -s nullglob nocaseglob
for img in "$FOLDER"/*.png "$FOLDER"/*.jpg "$FOLDER"/*.jpeg "$FOLDER"/*.webp "$FOLDER"/*.heic; do
  [ -f "$img" ] || continue
  filename=$(basename "$img")
  base="${filename%.*}"
  out="$OUTPUT_DIR/${base}.jpg"

  # Convert to JPEG and resize in one step
  sips -s format jpeg -s formatOptions 70 --resampleWidth "$MAX_WIDTH" "$img" --out "$out" > /dev/null 2>&1

  count=$((count + 1))
done
shopt -u nullglob nocaseglob

echo "Compressed $count images -> $OUTPUT_DIR (max ${MAX_WIDTH}px wide)"
if [ $count -gt 0 ]; then
  ls -lh "$OUTPUT_DIR" | tail -n +2 | awk '{print "  " $NF " -- " $5}'
fi
