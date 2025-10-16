# ChatGPT Apps SDK Architecture Documentation

## Overview

This is a Next.js application that integrates with ChatGPT using the **Model Context Protocol (MCP)** and **OpenAI Apps SDK**. It allows you to build interactive widgets that run inside ChatGPT's interface as embedded iframes.

### What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI assistants to communicate with external tools and resources. In this case, it allows ChatGPT to:
- Call tools (functions) on your server
- Fetch resources (HTML content) to display in widgets
- Pass data between ChatGPT and your application

### How It Works - High Level

```
ChatGPT User → ChatGPT Interface → MCP Server (Your App) → Widget Rendering in iframe
```

1. **User interacts with ChatGPT** and triggers a tool call
2. **ChatGPT calls your MCP server** at `/mcp` endpoint
3. **Your server responds** with data and a reference to a widget resource
4. **ChatGPT renders the widget** by loading your HTML in an iframe
5. **Your Next.js app hydrates** inside the iframe with special API patches
6. **User interacts with the widget** which can call back to ChatGPT

---

## Core Architecture Components

### 1. MCP Server (`app/mcp/route.ts`)

This is the **heart of the integration**. It's a Next.js API route that implements the MCP protocol.

#### What It Does:

**Registers Tools:**
- Tools are functions that ChatGPT can call
- Example: `show_content` tool that takes a user's name as input
- Tools have metadata that tells ChatGPT how to display loading states and widgets

**Registers Resources:**
- Resources are HTML content that get rendered in ChatGPT
- They use a special MIME type: `text/html+skybridge`
- Resources are linked to tools via `templateUri`

#### Key Code Breakdown:

```typescript
// Fetch the HTML from your homepage
const html = await getAppsSdkCompatibleHtml(baseURL, "/");

// Define a widget
const contentWidget: ContentWidget = {
  id: "show_content",
  title: "Show Content",
  templateUri: "ui://widget/content-template.html",  // Links to resource
  invoking: "Loading content...",                     // Loading text
  invoked: "Content loaded",                          // Success text
  html: html,                                         // The actual HTML
  description: "Displays the homepage content",
  widgetDomain: "https://nextjs.org/docs",
};
```

**Register the resource** (what gets displayed):
```typescript
server.registerResource(
  "content-widget",
  contentWidget.templateUri,
  {
    title: contentWidget.title,
    description: contentWidget.description,
    mimeType: "text/html+skybridge",  // Special MIME type for widgets
    _meta: {
      "openai/widgetDescription": contentWidget.description,
      "openai/widgetPrefersBorder": true,
    },
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/html+skybridge",
      text: `<html>${contentWidget.html}</html>`,
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": contentWidget.widgetDomain,
      },
    }],
  })
);
```

**Register the tool** (what ChatGPT can call):
```typescript
server.registerTool(
  contentWidget.id,
  {
    title: contentWidget.title,
    description: "Fetch and display the homepage content with the name of the user",
    inputSchema: {
      name: z.string().describe("The name of the user to display on the homepage"),
    },
    _meta: widgetMeta(contentWidget),  // Links tool to widget
  },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: name }],
      structuredContent: { name: name, timestamp: new Date().toISOString() },
      _meta: widgetMeta(contentWidget),
    };
  }
);
```

**OpenAI-Specific Metadata:**
```typescript
{
  "openai/outputTemplate": widget.templateUri,      // Links to resource
  "openai/toolInvocation/invoking": "Loading...",   // Loading state text (≤64 chars)
  "openai/toolInvocation/invoked": "Loaded",        // Completion state text (≤64 chars)
  "openai/widgetAccessible": false,                 // Allow component→tool calls (default: false)
  "openai/resultCanProduceWidget": true            // Enable widget rendering
}
```

**Important Notes:**
- `openai/widgetAccessible`: Set to `true` if you want your widget to call tools via `window.openai.callTool()`
- Status text limits: Both `invoking` and `invoked` must be ≤64 characters
- `openai/outputTemplate`: Must reference a registered resource with MIME type `text/html+skybridge`

---

### 2. Asset Configuration (`next.config.ts` + `baseUrl.ts`)

**Problem:** When your app runs in an iframe inside ChatGPT, Next.js tries to load assets (JS, CSS) from the iframe's URL, which causes 404 errors.

**Solution:** Set `assetPrefix` to your actual server URL.

#### `baseUrl.ts`:
```typescript
export const baseURL =
  process.env.NODE_ENV == "development"
    ? "http://localhost:3000"
    : "https://" +
      (process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL);
```

This automatically detects:
- **Development:** `http://localhost:3000`
- **Production:** Your Vercel production URL
- **Preview:** Your Vercel branch/preview URL

#### `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  assetPrefix: baseURL,  // All /_next/ assets will be fetched from baseURL
};
```

---

### 3. CORS Middleware (`middleware.ts`)

**Problem:** ChatGPT loads your app from a different origin, so browsers block cross-origin requests.

**Solution:** Add CORS headers to all responses.

```typescript
export function middleware(request: NextRequest) {
  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { 
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "*",
      }
    });
  }
  
  // Add CORS headers to all responses
  return NextResponse.next({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
```

This allows:
- **React Server Components (RSC)** to be fetched during client-side navigation
- **API calls** from the iframe to your server
- **Asset loading** from your server

---

### 4. SDK Bootstrap (`app/layout.tsx`)

**Problem:** When your Next.js app runs inside ChatGPT's iframe, browser APIs behave incorrectly:
- `history.pushState` uses full URLs instead of relative paths
- `fetch` requests go to the wrong origin
- ChatGPT modifies your HTML, causing hydration errors

**Solution:** The `<NextChatSDKBootstrap>` component patches browser APIs.

#### What It Patches:

**1. Base URL:**
```typescript
<base href={baseUrl}></base>
```
Sets the base URL for all relative links.

**2. HTML Attribute Observer:**
```typescript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "attributes" && mutation.target === htmlElement) {
      const attrName = mutation.attributeName;
      if (attrName && attrName !== "suppresshydrationwarning") {
        htmlElement.removeAttribute(attrName);  // Remove ChatGPT's modifications
      }
    }
  });
});
observer.observe(htmlElement, { attributes: true, attributeOldValue: true });
```
Prevents ChatGPT from modifying the `<html>` element.

**3. History API Patching:**
```typescript
const originalPushState = history.pushState;
history.pushState = (s, unused, url) => {
  const u = new URL(url ?? "", window.location.href);
  const href = u.pathname + u.search + u.hash;  // Extract relative path
  originalPushState.call(history, unused, href);
};
```
Prevents full-origin URLs in browser history.

**4. Fetch API Patching:**
```typescript
const isInIframe = window.self !== window.top;
if (isInIframe && window.location.origin !== appOrigin) {
  const originalFetch = window.fetch;
  
  window.fetch = (input, init) => {
    let url = new URL(input, window.location.href);
    
    // If fetching from iframe origin, rewrite to app origin
    if (url.origin === window.location.origin) {
      const newUrl = new URL(baseUrl);
      newUrl.pathname = url.pathname;
      newUrl.search = url.search;
      newUrl.hash = url.hash;
      url = newUrl;
    }
    
    return originalFetch.call(window, url.toString(), {
      ...init,
      mode: "cors",
    });
  };
}
```
Rewrites same-origin requests to use the correct base URL.

**5. External Link Handling:**
```typescript
window.addEventListener("click", (e) => {
  const a = (e?.target as HTMLElement)?.closest("a");
  if (!a || !a.href) return;
  
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin && url.origin != appOrigin) {
    if (window.openai) {
      window.openai.openExternal({ href: a.href });  // Open in new tab
      e.preventDefault();
    }
  }
}, true);
```
Opens external links in a new tab instead of inside the iframe.

---

### 5. React Hooks (`app/hooks/`)

These hooks provide access to ChatGPT's APIs and state from your React components.

#### OpenAI Global Object

ChatGPT injects a `window.openai` object with APIs and state:

```typescript
window.openai = {
  // Visual state
  theme: "light" | "dark",
  locale: "en",  // BCP 47 locale code
  userAgent: {
    device: { type: "mobile" | "tablet" | "desktop" | "unknown" },
    capabilities: { hover: boolean, touch: boolean }
  },
  
  // Layout state
  maxHeight: number,
  displayMode: "pip" | "inline" | "fullscreen",
  safeArea: { insets: { top, bottom, left, right } },
  
  // Tool state
  toolInput: {},      // Input passed to the tool
  toolOutput: {},     // Output returned from the tool (from structuredContent)
  toolResponseMetadata: {},
  
  // Widget state (persistent)
  widgetState: {},
  setWidgetState: (state) => Promise<void>,
  
  // APIs
  callTool: (name, args) => Promise<{ result: string }>,
  sendFollowUpMessage: ({ prompt }) => Promise<void>,
  openExternal: ({ href }) => void,
  requestDisplayMode: ({ mode }) => Promise<{ mode }>,
};
```

**Key Points:**
- `toolOutput`: Populated from the `structuredContent` field of your tool result
- `toolInput`: The arguments passed when ChatGPT called the tool
- `widgetState`: Persisted across sessions and exposed to ChatGPT (keep ≤4k tokens)
- `userAgent`: Device type and capabilities for responsive design

#### Available Hooks:

**State Hooks:**
- `useWidgetProps<T>()` - Get tool output data
- `useDisplayMode()` - Get current display mode (pip/inline/fullscreen)
- `useMaxHeight()` - Get maximum height for the widget
- `useWidgetState<T>()` - Get/set persistent widget state
- `useOpenAIGlobal(key)` - Get any property from `window.openai`

**API Hooks:**
- `useCallTool()` - Call other MCP tools
- `useSendMessage()` - Send messages to ChatGPT
- `useOpenExternal()` - Open external links
- `useRequestDisplayMode()` - Request display mode changes

#### Example Usage:

```typescript
"use client";

import { useWidgetProps, useMaxHeight, useDisplayMode, useRequestDisplayMode } from "./hooks";

export default function Home() {
  // Get data passed from the tool
  const toolOutput = useWidgetProps<{ name?: string }>();
  
  // Get layout info
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();
  
  // Get API to request fullscreen
  const requestDisplayMode = useRequestDisplayMode();
  
  return (
    <div style={{ maxHeight }}>
      <p>Hello, {toolOutput?.name}!</p>
      
      {displayMode !== "fullscreen" && (
        <button onClick={() => requestDisplayMode("fullscreen")}>
          Go Fullscreen
        </button>
      )}
    </div>
  );
}
```

---

## Complete Data Flow

### 1. Initial Tool Call

```
User in ChatGPT: "Show me the content for John"
    ↓
ChatGPT calls MCP server: POST /mcp
    {
      "method": "tools/call",
      "params": {
        "name": "show_content",
        "arguments": { "name": "John" }
      }
    }
    ↓
MCP Server responds:
    {
      "content": [{ "type": "text", "text": "John" }],
      "structuredContent": { "name": "John", "timestamp": "..." },
      "_meta": {
        "openai/outputTemplate": "ui://widget/content-template.html",
        "openai/resultCanProduceWidget": true
      }
    }
    ↓
ChatGPT sees "openai/outputTemplate" and fetches the resource
    ↓
ChatGPT calls MCP server: POST /mcp
    {
      "method": "resources/read",
      "params": {
        "uri": "ui://widget/content-template.html"
      }
    }
    ↓
MCP Server responds with HTML:
    {
      "contents": [{
        "mimeType": "text/html+skybridge",
        "text": "<html>...</html>"
      }]
    }
    ↓
ChatGPT renders HTML in iframe with:
    - window.openai.toolOutput = { name: "John", timestamp: "..." }
    - window.openai.toolInput = { name: "John" }
```

### 2. Widget Hydration

```
Iframe loads HTML
    ↓
<base href="http://localhost:3000"> sets base URL
    ↓
Bootstrap script patches browser APIs
    ↓
Next.js loads /_next/static/chunks/... from http://localhost:3000
    ↓
React hydrates the app
    ↓
useWidgetProps() reads window.openai.toolOutput
    ↓
Component renders with data: "Hello, John!"
```

### 3. Client-Side Navigation

```
User clicks <Link href="/custom-page">
    ↓
Next.js calls patched fetch() for RSC payload
    ↓
Patched fetch rewrites URL: 
    FROM: chatgpt.com/_next/data/...
    TO: http://localhost:3000/_next/data/...
    ↓
Fetch includes mode: "cors"
    ↓
CORS middleware adds headers
    ↓
RSC payload loads successfully
    ↓
Next.js renders new page in iframe
```

### 4. Widget Interactions

**Call Another Tool:**
```typescript
const callTool = useCallTool();
await callTool("another_tool", { param: "value" });
```

**Send Message to ChatGPT:**
```typescript
const sendMessage = useSendMessage();
sendMessage("Tell me more about this");
```

**Request Fullscreen:**
```typescript
const requestDisplayMode = useRequestDisplayMode();
await requestDisplayMode("fullscreen");
```

**Persist State:**
```typescript
const [state, setState] = useWidgetState({ count: 0 });
setState({ count: state.count + 1 });  // Persists across reloads
```

---

## Project Structure

```
chatgpt-apps-sdk-nextjs-starter/
├── app/
│   ├── mcp/
│   │   └── route.ts              # MCP server (tools + resources)
│   ├── hooks/
│   │   ├── index.ts              # Hook exports
│   │   ├── types.ts              # TypeScript types for OpenAI APIs
│   │   ├── use-openai-global.ts  # Base hook for accessing window.openai
│   │   ├── use-widget-props.ts   # Get tool output data
│   │   ├── use-display-mode.ts   # Get display mode
│   │   ├── use-max-height.ts     # Get max height
│   │   ├── use-request-display-mode.ts  # Request display mode changes
│   │   ├── use-call-tool.ts      # Call MCP tools
│   │   ├── use-send-message.ts   # Send messages to ChatGPT
│   │   ├── use-open-external.ts  # Open external links
│   │   └── use-widget-state.ts   # Persistent widget state
│   ├── custom-page/
│   │   └── page.tsx              # Example secondary page
│   ├── layout.tsx                # Root layout with SDK bootstrap
│   ├── page.tsx                  # Homepage (widget content)
│   └── globals.css               # Global styles
├── middleware.ts                 # CORS handling
├── next.config.ts                # Asset prefix configuration
├── baseUrl.ts                    # Base URL detection
├── package.json                  # Dependencies
└── README.md                     # Original README
```

---

## Key Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.20.0",  // MCP protocol implementation
  "mcp-handler": "^1.0.2",                 // Helper for creating MCP servers
  "next": "15.5.4",                        // Next.js framework
  "react": "19.1.0",                       // React
  "zod": "3.24.2"                          // Schema validation for tool inputs
}
```

---

## Development Workflow

### 1. Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to see the app.

The MCP server is available at `http://localhost:3000/mcp`.

### 2. Testing the MCP Server

You can test the MCP server locally by making POST requests:

**List Tools:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**Call a Tool:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "show_content",
      "arguments": {"name": "Alice"}
    },
    "id": 2
  }'
```

**Read a Resource:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/read",
    "params": {
      "uri": "ui://widget/content-template.html"
    },
    "id": 3
  }'
```

### 3. Deployment

**Deploy to Vercel:**
```bash
vercel deploy
```

Or use the one-click deploy button in the README.

**Connect to ChatGPT:**
1. Go to ChatGPT Settings → Connectors → Create
2. Add your MCP server URL: `https://your-app.vercel.app/mcp`
3. Save and test

**Note:** You need developer mode access in ChatGPT to connect MCP servers.

---

## Building Your Own ChatGPT App

### Step 1: Define Your Tools

Edit `app/mcp/route.ts` to add your own tools:

```typescript
server.registerTool(
  "my_tool",
  {
    title: "My Custom Tool",
    description: "Does something useful",
    inputSchema: {
      param1: z.string().describe("First parameter"),
      param2: z.number().describe("Second parameter"),
    },
    _meta: widgetMeta(myWidget),
  },
  async ({ param1, param2 }) => {
    // Your tool logic here
    const result = await doSomething(param1, param2);
    
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
      _meta: widgetMeta(myWidget),
    };
  }
);
```

### Step 2: Create Widget UI

Create a new page or modify `app/page.tsx`:

```typescript
"use client";

import { useWidgetProps } from "./hooks";

export default function MyWidget() {
  const data = useWidgetProps<{ param1: string; param2: number }>();
  
  return (
    <div>
      <h1>My Widget</h1>
      <p>Param 1: {data?.param1}</p>
      <p>Param 2: {data?.param2}</p>
    </div>
  );
}
```

### Step 3: Register the Resource

In `app/mcp/route.ts`, register the resource that points to your widget:

```typescript
const html = await getAppsSdkCompatibleHtml(baseURL, "/my-widget");

const myWidget: ContentWidget = {
  id: "my_tool",
  title: "My Widget",
  templateUri: "ui://widget/my-widget.html",
  invoking: "Loading...",
  invoked: "Loaded",
  html: html,
  description: "My custom widget",
  widgetDomain: "https://example.com",
};

server.registerResource(
  "my-widget",
  myWidget.templateUri,
  {
    title: myWidget.title,
    description: myWidget.description,
    mimeType: "text/html+skybridge",
    _meta: {
      "openai/widgetDescription": myWidget.description,
      "openai/widgetPrefersBorder": true,
    },
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/html+skybridge",
      text: `<html>${myWidget.html}</html>`,
      _meta: {
        "openai/widgetDescription": myWidget.description,
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": myWidget.widgetDomain,
      },
    }],
  })
);
```

### Step 4: Test and Deploy

1. Test locally: `npm run dev`
2. Deploy to Vercel: `vercel deploy`
3. Connect to ChatGPT with your MCP server URL

---

## Advanced Features

### Persistent Widget State

Use `useWidgetState` to persist data across widget reloads:

```typescript
const [state, setState] = useWidgetState({ count: 0 });

<button onClick={() => setState({ count: state.count + 1 })}>
  Count: {state.count}
</button>
```

**Important:** Everything in `widgetState` is:
1. **Exposed to ChatGPT** - The model can see and reason about this data
2. **Persisted across sessions** - Survives page reloads and conversation restarts
3. **Limited to ~4k tokens** - Keep the payload small for best performance

Use `widgetState` for user preferences, selections, or context that ChatGPT should know about. For internal UI state that doesn't need persistence, use regular React `useState`.

### Display Mode Control

Request different display modes:

```typescript
const requestDisplayMode = useRequestDisplayMode();

// Request fullscreen
await requestDisplayMode("fullscreen");

// Request picture-in-picture
await requestDisplayMode("pip");

// Request inline
await requestDisplayMode("inline");
```

### Calling Other Tools

Call other MCP tools from your widget:

```typescript
const callTool = useCallTool();

const result = await callTool("another_tool", {
  param: "value"
});
```

**Important:** For `callTool()` to work, the target tool must have `"openai/widgetAccessible": true` in its `_meta`:

```typescript
server.registerTool(
  "refresh_data",
  {
    title: "Refresh Data",
    description: "Refreshes the data",
    inputSchema: { city: z.string() },
    _meta: {
      "openai/widgetAccessible": true,  // Allow widget to call this tool
    },
  },
  async ({ city }) => {
    // Tool implementation
  }
);
```

### Sending Messages to ChatGPT

Send follow-up messages to the conversation:

```typescript
const sendMessage = useSendMessage();

sendMessage("Can you explain this data?");
```

---

## Common Issues and Solutions

### Issue 1: 404 on /_next/ Assets

**Problem:** Next.js assets fail to load in the iframe.

**Solution:** Ensure `assetPrefix` is set in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  assetPrefix: baseURL,
};
```

### Issue 2: CORS Errors

**Problem:** Fetch requests fail with CORS errors.

**Solution:** Ensure `middleware.ts` is adding CORS headers to all responses.

### Issue 3: Hydration Errors

**Problem:** React hydration mismatches.

**Solution:** Add `suppressHydrationWarning` to `<html>` tag:
```typescript
<html lang="en" suppressHydrationWarning>
```

### Issue 4: Navigation Doesn't Work

**Problem:** Client-side navigation fails.

**Solution:** Ensure the SDK bootstrap script is patching `fetch` and `history` APIs.

### Issue 5: Widget Doesn't Render

**Problem:** ChatGPT doesn't show the widget.

**Solution:** Check that:
1. Tool has `"openai/resultCanProduceWidget": true` in `_meta`
2. Tool has `"openai/outputTemplate"` pointing to a registered resource
3. Resource has MIME type `"text/html+skybridge"`
4. Tool result includes `structuredContent` field (this populates `window.openai.toolOutput`)

### Issue 6: callTool() Doesn't Work

**Problem:** `window.openai.callTool()` fails or returns errors.

**Solution:** Ensure the target tool has `"openai/widgetAccessible": true` in its `_meta`.

---

## Security Considerations

### CORS Configuration

The current CORS configuration allows all origins (`*`). For production, consider restricting to ChatGPT's domains:

```typescript
"Access-Control-Allow-Origin": "https://chatgpt.com"
```

### Input Validation

Always validate tool inputs using Zod schemas:

```typescript
inputSchema: {
  email: z.string().email().describe("User email"),
  age: z.number().min(0).max(120).describe("User age"),
}
```

### API Keys

Never expose API keys in client-side code. Use server-side API routes:

```typescript
// app/api/data/route.ts
export async function GET() {
  const data = await fetch("https://api.example.com", {
    headers: {
      "Authorization": `Bearer ${process.env.API_KEY}`
    }
  });
  return Response.json(await data.json());
}
```

---

## Additional Metadata Fields

### Tool Result Structure

Tool results support three key fields:

```typescript
return {
  // Shown to ChatGPT and available in widget
  content: [
    { type: "text", text: "User-facing description" }
  ],
  
  // Shown to ChatGPT and populates window.openai.toolOutput
  structuredContent: {
    name: "John",
    items: [...],
    timestamp: "2024-01-01T00:00:00Z"
  },
  
  // Hidden from ChatGPT, only sent to widget
  _meta: {
    internalData: { ... },
    allItemsById: { ... }
  }
};
```

**Key Differences:**
- `content`: Text shown in the conversation transcript
- `structuredContent`: Data for both ChatGPT and your widget (becomes `toolOutput`)
- `_meta`: Private data only for your widget, hidden from ChatGPT

### Resource Metadata

Additional `_meta` fields for resources:

```typescript
server.registerResource(
  "my-widget",
  "ui://widget/my-widget.html",
  { /* ... */ },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "text/html+skybridge",
      text: html,
      _meta: {
        "openai/widgetDescription": "Human-readable summary for ChatGPT",
        "openai/widgetPrefersBorder": true,
        "openai/widgetDomain": "https://your-app.com",
        "openai/widgetCSP": {
          connect_domains: ["https://api.example.com"],
          resource_domains: ["https://cdn.example.com"]
        }
      }
    }]
  })
);
```

**Field Purposes:**
- `widgetDescription`: Helps ChatGPT understand what the widget shows (reduces redundant narration)
- `widgetPrefersBorder`: Renders widget in a bordered card
- `widgetDomain`: Custom subdomain for hosted components
- `widgetCSP`: Content Security Policy for external domains

### Client-Provided Metadata

ChatGPT sends metadata with tool calls that you can access:

```typescript
server.registerTool(
  "recommend_cafe",
  { /* ... */ },
  async (args, { _meta }) => {
    const locale = _meta?.["openai/locale"] ?? "en";  // BCP 47 locale
    const userAgent = _meta?.["openai/userAgent"];    // User agent string
    const location = _meta?.["openai/userLocation"];  // { city, region, country, timezone, longitude, latitude }
    
    // Use hints for formatting or analytics
    // Never use for authorization!
    
    return { /* ... */ };
  }
);
```

**Important:** These are **hints only**. Never rely on them for authorization decisions.

### Tool Annotations

Mark tools as read-only to help ChatGPT with planning:

```typescript
server.registerTool(
  "list_items",
  {
    title: "List Items",
    description: "Returns items without modifying them",
    inputSchema: { type: "object", properties: {} },
    annotations: {
      readOnlyHint: true  // Signals this tool doesn't mutate state
    }
  },
  async () => fetchItems()
);
```

## Resources

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI Apps SDK - MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [OpenAI Apps SDK - Build Custom UX](https://developers.openai.com/apps-sdk/build/custom-ux)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com)

---

## Summary

This ChatGPT Apps SDK starter demonstrates:

1. **MCP Server** - Exposes tools and resources to ChatGPT
2. **Widget Rendering** - Displays Next.js apps in ChatGPT iframes
3. **API Patching** - Makes Next.js work correctly in iframes
4. **React Hooks** - Provides easy access to ChatGPT APIs
5. **CORS Handling** - Enables cross-origin requests
6. **Asset Configuration** - Ensures assets load from the correct origin

You can use this as a foundation to build interactive ChatGPT apps with full Next.js capabilities, including:
- Server-side rendering
- Client-side navigation
- API routes
- Database integration
- External API calls
- Complex UI components

The key is understanding how the MCP protocol connects ChatGPT to your app, and how the SDK bootstrap makes Next.js work inside ChatGPT's iframe environment.
