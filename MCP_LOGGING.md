# MCP Communication Logging Guide

## Overview

The MCP route (`app/mcp/route.ts`) includes comprehensive logging to help debug communication between ChatGPT and your server.

## Enable Logging

Set the `LOG_MCP` environment variable to control logging verbosity:

### Local Development

Add to `.env.local`:

```bash
# No logging (default)
LOG_MCP=none

# Basic logging - tool calls and results
LOG_MCP=basic

# Full logging - includes request/response payloads
LOG_MCP=full

# Verbose logging - everything including metadata
LOG_MCP=verbose
```

Then restart your dev server:
```bash
pnpm dev
```

### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `LOG_MCP` with value `basic`, `full`, or `verbose`
4. Redeploy your app

## View Logs

### Local Development
Logs appear in the terminal where `pnpm dev` is running.

### Vercel Production
1. Go to your Vercel project dashboard
2. Click **Logs** tab
3. Filter by "Runtime Logs"
4. Look for `[MCP]` prefix

## Log Levels

### `LOG_MCP=basic`
Shows tool calls and basic info:
```
[MCP] 🔍 search_courses called
[MCP]   ✅ Returning 2 courses
[MCP] 📋 get_course_details called
[MCP]   ✅ Returning details for demo-1
[MCP] 🎯 book_tee_time called
[MCP]   ✅ Returning booking link
```

### `LOG_MCP=full`
Includes complete request/response payloads:
```
[MCP] 🔍 search_courses called
[MCP]   Input: { location: 'San Diego', radius: 50, filters: {} }
[MCP]   Response: {
  "content": [{ "type": "text", "text": "Found 2 course(s) near San Diego." }],
  "structuredContent": {
    "courses": [...],
    "searchContext": {...}
  },
  "_meta": {...}
}
[MCP]   ✅ Returning 2 courses
```

### `LOG_MCP=verbose`
Everything from `full` plus extra context (MCP metadata, user location, etc.):
```
[MCP] 🔍 search_courses called
[MCP]   Input: { location: 'San Diego', radius: 50, filters: {} }
[MCP]   Extra context: {
  "_meta": {
    "openai/userAgent": "ChatGPT/1.2025.012",
    "openai/locale": "en-US",
    "openai/userLocation": {...}
  }
}
[MCP]   Response: {...}
[MCP]   ✅ Returning 2 courses
```

## Common Debugging Scenarios

### Widget not loading in ChatGPT
```bash
LOG_MCP=full
```
Check:
- Is the tool being called?
- Does the response include `_meta["openai/outputTemplate"]`?
- Is the CSP configured correctly?

### Tool returning wrong data
```bash
LOG_MCP=full
```
Check:
- What inputs is ChatGPT sending?
- What's in the `structuredContent` response?

### Understanding user context
```bash
LOG_MCP=verbose
```
Check:
- `extra._meta["openai/locale"]` - user's language
- `extra._meta["openai/userLocation"]` - user's location
- `extra._meta["openai/userAgent"]` - ChatGPT client version

## Performance Notes

- Logging has minimal performance impact
- `verbose` mode logs the most data (use sparingly in production)
- Logs are written to stdout/stderr (captured by Vercel)
- Consider using `basic` in production for ongoing monitoring

## Troubleshooting

### Logs not appearing in Vercel
1. Ensure you redeployed after adding the env var
2. Check you're looking at **Runtime Logs** (not Build Logs)
3. Try filtering by `/mcp` in the search box

### Too much noise in logs
- Use `LOG_MCP=basic` instead of `full` or `verbose`
- Add conditional logging based on specific tool names

### Need to log custom data
Edit `app/mcp/route.ts` and add custom log statements:
```typescript
log.basic("Custom message:", yourData);
log.full("Detailed info:", JSON.stringify(yourData, null, 2));
```
