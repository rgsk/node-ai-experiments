#!/bin/bash

# Check if URL is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <URL>"
  exit 1
fi

URL=$1

# Fetch HTML content once and store it in a variable
HTML_CONTENT=$(curl -s "$URL")

# Parse metadata from the stored HTML content
TITLE=$(echo "$HTML_CONTENT" | pup 'meta[property="og:title"] attr{content}')
DESCRIPTION=$(echo "$HTML_CONTENT" | pup 'meta[property="og:description"] attr{content}')
IMAGE=$(echo "$HTML_CONTENT" | pup 'meta[property="og:image"] attr{content}')
URL=$(echo "$HTML_CONTENT" | pup 'meta[property="og:url"] attr{content}')

# If og:title is not found, fallback to the <title> tag
if [ -z "$TITLE" ]; then
  TITLE=$(echo "$HTML_CONTENT" | pup 'title text{}')
fi

# Convert the output to JSON
jq -n \
  --arg title "$TITLE" \
  --arg description "$DESCRIPTION" \
  --arg image "$IMAGE" \
  --arg url "$URL" \
  '{
    title: $title,
    description: $description,
    image: $image,
    url: $url
  }'