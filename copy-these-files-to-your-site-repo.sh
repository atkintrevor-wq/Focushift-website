#!/usr/bin/env bash
# Copies Universal Link + share landing files from this folder into your live
# website repo (e.g. Focushift-website on your machine). Run from Terminal.
#
# Usage:
#   chmod +x copy-these-files-to-your-site-repo.sh
#   ./copy-these-files-to-your-site-repo.sh /full/path/to/Focushift-website
#
set -e
DEST="${1:-}"
if [[ -z "$DEST" ]]; then
  echo "You must pass the real folder path to your website repo (not the words /path/to/...)."
  echo "Example: $0 /Users/trevoratkin/Desktop/Focushift-website"
  exit 1
fi
if [[ "$DEST" == *"/path/to"* ]]; then
  echo "That looks like the placeholder from the docs. Use your actual folder, e.g.:"
  echo "  $0 /Users/trevoratkin/Desktop/Focushift-website"
  exit 1
fi
if [[ ! -d "$DEST" ]]; then
  echo "No folder here: $DEST"
  echo "Find your repo in Finder, ⌘+Option+C on the folder to copy the path, then:"
  echo "  $0 <paste-path-here>"
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$DEST/.well-known"
cp "$HERE/.well-known/apple-app-site-association" "$DEST/.well-known/"
cp "$HERE/_headers" "$DEST/"
cp "$HERE/_redirects" "$DEST/"
cp "$HERE/share-link-fallback.html" "$DEST/"

echo "Done. Copied into: $DEST"
echo "Next: cd \"$DEST\" && git status"
echo "Then: cd \"$DEST\""
echo "      git add .well-known/apple-app-site-association _headers _redirects share-link-fallback.html"
echo "      git commit -m \"Add share link landing + redirects for /s/*\""
echo "      git pull --rebase origin main && git push"
echo "(If your branch is not main, replace main. If push says rejected, run: git pull --rebase origin main && git push)"
