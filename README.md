# ChatGPT Apps SDK Next.js Starter

A minimal Next.js application demonstrating how to build an [OpenAI Apps SDK](https://developers.openai.com/apps-sdk) compatible MCP server with widget rendering in ChatGPT.

## Overview

This project shows how to integrate a Next.js application with the ChatGPT Apps SDK using the Model Context Protocol (MCP). It includes a working MCP server that exposes tools and resources that can be called from ChatGPT, with responses rendered natively in ChatGPT.

## Key Components

### 1. MCP Server Route (`app/mcp/route.ts`)

The core MCP server implementation that exposes tools and resources to ChatGPT.

**Key features:**
- **Tool registration** with OpenAI-specific metadata
- **Resource registration** that serves HTML content for iframe rendering
- **Cross-linking** between tools and resources via `templateUri`

**OpenAI-specific metadata:**
```typescript
{
  "openai/outputTemplate": widget.templateUri,      // Links to resource
  "openai/toolInvocation/invoking": "Loading...",   // Loading state text
  "openai/toolInvocation/invoked": "Loaded",        // Completion state text
  "openai/widgetAccessible": false,                 // Widget visibility
  "openai/resultCanProduceWidget": true            // Enable widget rendering
}
```

Full configuration options: [OpenAI Apps SDK MCP Documentation](https://developers.openai.com/apps-sdk/build/mcp-server)

### 2. Asset Configuration (`next.config.ts`)

**Critical:** Set `assetPrefix` to ensure `/_next/` static assets are fetched from the correct origin:

```typescript
const nextConfig: NextConfig = {
  assetPrefix: baseURL,  // Prevents 404s on /_next/ files in iframe
};
```

Without this, Next.js will attempt to load assets from the iframe's URL, causing 404 errors.

### 3. CORS Middleware (`middleware.ts`)

Handles browser OPTIONS preflight requests required for cross-origin RSC (React Server Components) fetching during client-side navigation:

```typescript
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    // Return 204 with CORS headers
  }
  // Add CORS headers to all responses
}
```

### 4. SDK Bootstrap (`app/layout.tsx`)

The `<NextChatSDKBootstrap>` component patches browser APIs to work correctly within the ChatGPT iframe:

**What it patches:**
- `history.pushState` / `history.replaceState` - Prevents full-origin URLs in history
- `window.fetch` - Rewrites same-origin requests to use the correct base URL
- `<html>` attribute observer - Prevents ChatGPT from modifying the root element

**Required configuration:**
```tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <NextChatSDKBootstrap baseUrl={baseURL} />
  </head>
  <body>{children}</body>
</html>
```

**Note:** `suppressHydrationWarning` is currently required because ChatGPT modifies the initial HTML before the Next.js app hydrates, causing hydration mismatches.

## Getting Started

### Installation

```bash
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Testing the MCP Server

The MCP server is available at:
```
http://localhost:3000/mcp
```

### Connecting from ChatGPT

1. [Deploy your app to Vercel](https://vercel.com/new/clone?demo-description=Ship%20an%20ChatGPT%20app%20on%20Vercel%20with%20Next.js%20and%20Model%20Context%20Protocol%20%28MCP%29.%0A&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F5TdbPy0tev8hh3rTOsdfMm%2F155b970ca5e75adb74206db26493efc7%2Fimage.png&demo-title=ChatGPT%20app%20with%20Next.js&demo-url=https%3A%2F%2Fchatgpt-apps-sdk-nextjs-starter.labs.vercel.dev%2F&from=templates&project-name=ChatGPT%20app%20with%20Next.js&project-names=Comma%20separated%20list%20of%20project%20names%2Cto%20match%20the%20root-directories&repository-name=chatgpt-app-with-next-js&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fchatgpt-apps-sdk-nextjs-starter&root-directories=List%20of%20directory%20paths%20for%20the%20directories%20to%20clone%20into%20projects&skippable-integrations=1&teamSlug=vercel)
3. In ChatGPT, navigate to **Settings → [Connectors](https://chatgpt.com/#settings/Connectors) → Create** and add your MCP server URL with the `/mcp` path (e.g., `https://your-app.vercel.app/mcp`)

**Note:** Connecting MCP servers to ChatGPT requires developer mode access. See the [connection guide](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) for setup instructions.


## Project Structure

```
app/
├── mcp/
│   └── route.ts          # MCP server with tool/resource registration
├── layout.tsx            # Root layout with SDK bootstrap
├── page.tsx              # Homepage content
└── globals.css           # Global styles
middleware.ts             # CORS handling for RSC
next.config.ts            # Asset prefix configuration
```

## How It Works

1. **Tool Invocation**: ChatGPT calls a tool registered in `app/mcp/route.ts`
2. **Resource Reference**: Tool response includes `templateUri` pointing to a registered resource
3. **Widget Rendering**: ChatGPT fetches the resource HTML and renders it in an iframe
4. **Client Hydration**: Next.js hydrates the app inside the iframe with patched APIs
5. **Navigation**: Client-side navigation uses patched `fetch` to load RSC payloads

## Learn More

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI Apps SDK - MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Next.js Documentation](https://nextjs.org/docs)

## Deployment

This project is designed to work seamlessly with [Vercel](https://vercel.com) deployment. The `baseUrl.ts` configuration automatically detects Vercel environment variables and sets the correct asset URLs.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter)

The configuration automatically handles:
- Production URLs via `VERCEL_PROJECT_PRODUCTION_URL`
- Preview/branch URLs via `VERCEL_BRANCH_URL`
- Asset prefixing for correct resource loading in iframes

---

# Golf.ai Addendum

This starter has been extended into a Golf.ai Explorer that integrates a live map UI, booking provider lookups, and MCP tools. Below is everything you need to run and develop the Golf.ai features.

## Key Features

- **Golf Explorer UI** in `app/golf/page.tsx`
- **MCP tools** in `app/mcp/route.ts` for course search and details
- **Tee time fetching** via `app/api/teefox/route.ts` and the `useTeeTimes()` hook
- **Mapbox map** with custom markers and availability colors
- **Inline and fullscreen layouts** with shared behaviors

## Environment Variables

Create `.env.local` and set the following:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
TEEFOX_API=your-teefox-api-key
LOG_MCP=basic                 # optional: basic|full|verbose
```

If your data layer is backed by Supabase (see `lib/golfData.ts`):

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## MCP Tools (app/mcp/route.ts)

- **Resources**
  - Registers `ui://widget/golf.html` with cache-busting version and CSP:
    - `connect_domains`: `api.mapbox.com`, `events.mapbox.com`, `i.postimg.cc`
    - `resource_domains`: `api.mapbox.com`, `i.postimg.cc`
- **Tools**
  - `search_courses_by_area(city?, state?, country?, radius?, filters?)`
  - `get_course_details(courseId? | name+location)`
  - `book_tee_time(courseId, date?, time?, players?)`
- Enable structured widget rendering via OpenAI-specific `_meta` fields.

## Tee Times Flow

- API route: `GET /api/teefox` implemented in `app/api/teefox/route.ts`
  - Required: `location_id`, `date` (YYYY-MM-DD)
  - Optional: `patrons="[1]"`, `holes="[9]"`
  - Uses `TEEFOX_API` header `x-api-key`
  - 10s timeout via `AbortSignal.timeout(10000)`
  - 404 returns an empty list; when `totalTeetimes === 0` the full response is logged for debugging

- Hook: `app/hooks/use-tee-times.ts`
  - `fetchTeeTimes(locationId, date, { patrons?, holes? })`
  - Robust error handling; on failure it returns `{ meta, teetimes: [] }` to avoid UI breakage

## UI Behaviors (app/golf/page.tsx)

- **Initial fetch without filters**: On first card open, we call `fetchTeeTimes(locationId, date)` with no patrons/holes. Filters are applied only after the user changes them.
- **Filter controls**: Players and holes dropdowns trigger refetch with selected values.
- **Price tooltips**: Hovering a tee time shows a tooltip with `pricePerPatron` (e.g., `$89.00 per person`).
- **Booking URLs**: If a `bookingUrl` lacks protocol, `https://` is prepended before `window.open(...)`.
- **Provider handling**: Both `teebox` and `teefox` indicate a bookable provider throughout the UI (badges, widths, fetching, etc.).
- **Marker colors** (`getMarkerColor()`):
  - No provider → black marker
  - With provider → deterministic color from a spectrum based on course ID hash
- **Card centering**: When a card expands, we smooth-scroll so its center aligns with the screen center.
- **Hosted assets**: Verified badge and logos use CDN URLs, not local files:
  - Verified: `https://i.postimg.cc/WbqRWDPb/verfied-badge.png`
  - Inline logo: `https://i.postimg.cc/q709vj6t/logo-inline.jpg`
  - Fullscreen logo: `https://i.postimg.cc/4dxqzy5V/logo-fullscreen.jpg`

## Files of Interest

- **UI**: `app/golf/page.tsx`
- **MCP**: `app/mcp/route.ts`
- **Tee Times Hook**: `app/hooks/use-tee-times.ts`
- **API Route**: `app/api/teefox/route.ts`
- **Data Layer**: `lib/golfData.ts`

## Known Issues & Tips

- **Favicon conflict**: If you see “conflicting public file and page file for path /favicon.ico”, ensure you only have a single favicon, either `public/favicon.ico` or `app/favicon.ico` (remove one).
- **Missing protocol on booking URLs**: Handled in the UI (we prepend `https://`), but providers should ideally include full URLs.
- **Local development**: In local mode `window.openai` is undefined; the UI still renders and interactions work, but MCP-driven widget state is a no-op.

## Testing Notes

- Inspect console logs for:
  - `[TeeBox] Fetching tee times: ...`
  - `No tee times found ...` and the full response payload when empty
  - MCP logs controlled by `LOG_MCP`

