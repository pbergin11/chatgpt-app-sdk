# OpenAI Apps SDK - Master Reference Document

**Version:** Preview (2025)  
**Last Updated:** 2025-10-07  
**Status:** Living Document - Continuously Updated

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Concepts](#core-concepts)
3. [Architecture Overview](#architecture-overview)
4. [Design Guidelines](#design-guidelines)
5. [Display Modes](#display-modes)
6. [Visual Design System](#visual-design-system)
7. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
8. [User Interaction & Discovery](#user-interaction--discovery)
9. [Authentication & Authorization](#authentication--authorization)
10. [Storage & State Management](#storage--state-management)
11. [Custom UI Components](#custom-ui-components)
12. [Security & Privacy](#security--privacy)
13. [Metadata Optimization](#metadata-optimization)
14. [API Reference](#api-reference)
15. [Developer Guidelines & Policies](#developer-guidelines--policies)
16. [Implementation Checklist](#implementation-checklist)
17. [Best Practices](#best-practices)
18. [Common Patterns](#common-patterns)
19. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### What is Apps SDK?

OpenAI Apps SDK enables developers to build **interactive, conversational applications** that live inside ChatGPT. Apps extend ChatGPT's capabilities through:

- **Inline cards** - Lightweight widgets embedded in conversation
- **Carousels** - Horizontal scrolling collections of items
- **Fullscreen views** - Immersive experiences with rich interactions
- **Picture-in-Picture** - Persistent floating windows for ongoing sessions

### Key Characteristics

✅ **Conversational** - Natural extension of ChatGPT's flow  
✅ **Context-Aware** - Apps understand conversation history  
✅ **Interactive** - Users can chat while interacting with UI  
✅ **Dynamic** - Real-time updates and state management  
✅ **Sandboxed** - Secure iframe execution environment

### What Makes a Good App?

**Good Use Cases:**
- Booking rides, ordering food, scheduling
- Quick lookups with actionable results
- Time-bound tasks with clear outcomes
- Visual summaries with clear CTAs
- Interactive tools (games, quizzes, calculators)

**Poor Use Cases:**
- Long-form static content (better for websites)
- Complex multi-step workflows
- Ads or promotional content
- Sensitive data display without proper controls
- Duplicating ChatGPT's native features

---

## Core Concepts

### The Apps SDK Stack

```
┌─────────────────────────────────────┐
│         ChatGPT Interface           │
│  (Conversation, Composer, Chrome)   │
├─────────────────────────────────────┤
│         Display Modes               │
│  Inline │ Carousel │ Full │ PiP    │
├─────────────────────────────────────┤
│      Sandboxed iframe (Skybridge)   │
│      window.openai Bridge API       │
├─────────────────────────────────────┤
│      React Component Bundle         │
│      (Your Custom UI)               │
├─────────────────────────────────────┤
│      MCP Server                     │
│      (Tools, Resources, Auth)       │
├─────────────────────────────────────┤
│      Your Backend Services          │
│      (APIs, Database, Storage)      │
└─────────────────────────────────────┘
```

### Key Components

1. **MCP Server** - Exposes tools and resources via Model Context Protocol
2. **Tool Definitions** - JSON Schema describing inputs/outputs
3. **Component Bundle** - React app rendered in sandboxed iframe
4. **window.openai Bridge** - Communication layer between iframe and ChatGPT
5. **Structured Content** - JSON data passed between model and component

---

## Architecture Overview

### Request Flow

```
User Prompt
    ↓
Model evaluates tools (based on metadata)
    ↓
Model selects tool & generates arguments
    ↓
MCP Server receives call_tool request
    ↓
Server executes business logic
    ↓
Returns: structuredContent + content + _meta
    ↓
ChatGPT renders component inline
    ↓
Component reads window.openai.toolOutput
    ↓
User interacts with component
    ↓
Component calls window.openai.callTool()
    ↓
[Cycle repeats]
```

### Data Flow

**Tool Input → Server → Tool Output → Component → User Action → Follow-up**

- **toolInput**: Arguments from model
- **toolOutput**: Structured data for component
- **widgetState**: Persisted UI state
- **_meta**: Hidden data for component only

---

## Design Guidelines

### Principles

1. **Conversational** - Seamless integration with chat flow
2. **Intelligent** - Context-aware and anticipatory
3. **Simple** - Single clear action per interaction
4. **Responsive** - Fast and lightweight
5. **Accessible** - Support for assistive technologies

### Boundaries

**ChatGPT Controls:**
- System voice and tone
- Navigation chrome
- Composer input
- Theme and styling framework

**Developers Control:**
- Content and data
- Brand presence (icons, accents)
- Actions and interactions
- Component layout within constraints

### Good vs Poor Use Cases

| Good ✅ | Poor ❌ |
|---------|---------|
| Booking a ride | Displaying entire website |
| Ordering food | Complex 10-step workflows |
| Checking availability | Ads and upsells |
| Tracking delivery | Sensitive data without controls |
| Interactive games | Recreating composer input |
| Quick lookups | Long-form articles |

---

## Display Modes

### 1. Inline

**When to use:** Single actions, quick confirmations, simple data display

**Layout:**
- Icon & tool call label
- Inline card (auto-height, max viewport height)
- Follow-up text from model

**Features:**
- Title (optional)
- Expand button (for fullscreen)
- Show more (for lists)
- Edit controls (inline edits)
- Primary actions (max 2)

**Rules:**
- ✅ Max 2 primary actions
- ✅ Auto-fit content (no internal scroll)
- ❌ No deep navigation
- ❌ No nested scrolling
- ❌ No duplicative inputs

**Example Use Cases:**
- Order confirmation
- Map with single location
- Audio player
- Score card

### 2. Inline Carousel

**When to use:** Multiple similar items with rich visuals

**Layout:**
- Horizontal scroll
- 3-8 items recommended
- Image + title + metadata + badge + CTA

**Rules:**
- ✅ Always include images
- ✅ Max 3 lines of text per card
- ✅ Single CTA per item
- ✅ Consistent visual hierarchy
- ❌ Don't exceed 8 items

**Example Use Cases:**
- Restaurant listings
- Product catalogs
- Event listings
- Playlist items

### 3. Fullscreen

**When to use:** Rich tasks, browsing, multi-step workflows

**Layout:**
- System close button
- Full content area
- Overlaid composer (always present)

**Interaction:**
- Chat sheet (conversational context)
- Thinking indicator
- Response snippets above composer

**Rules:**
- ✅ Design for composer overlay
- ✅ Support conversational prompts
- ❌ Don't replicate entire native app
- ❌ Don't block composer

**Example Use Cases:**
- Explorable maps with pins
- Rich editing canvas
- Interactive diagrams
- Detailed browsing (real estate, menus)

### 4. Picture-in-Picture (PiP)

**When to use:** Ongoing/live sessions parallel to conversation

**Interaction:**
- Activated: Fixed to top on scroll
- Pinned: Remains until dismissed
- Session ends: Returns to inline position

**Rules:**
- ✅ Update based on chat input
- ✅ Auto-close when session ends
- ❌ Don't overload with controls
- ❌ Don't use for static content

**Example Use Cases:**
- Games
- Live collaboration
- Quizzes
- Learning sessions
- Video players

---

## Visual Design System

### Color

**System Colors:**
- Text, icons, dividers use ChatGPT's palette
- Light/dark theme support automatic

**Brand Colors:**
- Use on primary buttons
- Accents and badges
- Icons and logos
- ❌ Don't override backgrounds or text colors

### Typography

**Font Stack:**
- iOS: SF Pro
- Android: Roboto
- System-native always

**Sizing:**
- Prefer body and body-small
- Use system font variables
- ❌ No custom fonts

### Spacing & Layout

**Grid System:**
- Use system spacing tokens
- Consistent padding and margins
- Respect corner radius standards
- Maintain visual hierarchy

### Icons & Imagery

**Icons:**
- System icons or custom (monochromatic, outlined)
- ❌ Don't include logo in response (auto-appended)

**Images:**
- Follow enforced aspect ratios
- Provide alt text (accessibility)
- Optimize for performance

### Accessibility

**Requirements:**
- WCAG AA contrast ratios
- Alt text for all images
- Support text resizing
- Keyboard navigation
- Screen reader compatible

---

## Model Context Protocol (MCP)

### What is MCP?

Open specification connecting LLM clients to external tools and resources.

**Core Capabilities:**
1. **List tools** - Advertise available tools with schemas
2. **Call tools** - Execute actions with arguments
3. **Return components** - Provide UI templates

### Protocol Building Blocks

```typescript
// Tool registration
server.registerTool(
  "tool_name",
  {
    title: "Human-readable title",
    description: "Use this when user wants to...",
    inputSchema: {
      type: "object",
      properties: { /* JSON Schema */ },
      required: ["field1"]
    },
    _meta: {
      "openai/outputTemplate": "ui://widget/component.html",
      "openai/widgetAccessible": true
    }
  },
  async (args) => {
    // Execute logic
    return {
      structuredContent: { /* data */ },
      content: [{ type: "text", text: "..." }],
      _meta: { /* component-only data */ }
    };
  }
);
```

### Transport Options

- **Streamable HTTP** (recommended)
- **Server-Sent Events (SSE)**

### Benefits

✅ **Discovery integration** - Natural-language tool selection  
✅ **Conversation awareness** - Context flows through chat  
✅ **Multiclient support** - Works across web and mobile  
✅ **Extensible auth** - OAuth 2.1, dynamic registration

---

## User Interaction & Discovery

### Discovery Methods

#### 1. Named Mention
User explicitly names your app at start of prompt
```
"Using Pizzaz, find pizza near me"
```

#### 2. In-Conversation Discovery
Model evaluates:
- Conversation context & history
- Brand mentions and citations
- Tool metadata quality
- User linking state

**Influence discovery by:**
- Action-oriented descriptions
- Clear component descriptions
- Testing golden prompt sets
- Monitoring precision/recall

#### 3. Directory
Browsable catalog with:
- App name and icon
- Short and long descriptions
- Tags and categories
- Onboarding instructions
- Screenshots

### Entry Points

#### In-Conversation Entry
- Tools always available when linked
- Model decides based on context
- Keep descriptions action-oriented
- Return stable IDs for follow-ups

#### Launcher
- Explicit app selection (+ button)
- High-intent entry point
- Include starter prompts
- Context-aware ranking

---

## Authentication & Authorization

### OAuth 2.1 Flow

**Components:**
1. **Resource Server** - Your MCP server
2. **Authorization Server** - Your identity provider
3. **Client** - ChatGPT (supports PKCE + dynamic registration)

### Required Endpoints

```
/.well-known/oauth-protected-resource
/.well-known/openid-configuration
/oauth/token
/oauth/register
```

### Discovery Document

Must include:
- `authorization_endpoint`
- `token_endpoint`
- `jwks_uri`
- `registration_endpoint`

### Implementation Flow

1. ChatGPT queries protected resource metadata
2. ChatGPT registers via `registration_endpoint`
3. User authorizes (OAuth code + PKCE)
4. ChatGPT exchanges code for access token
5. Token attached to subsequent MCP requests
6. Server verifies token on each call

### Token Verification

```python
from mcp.server.fastmcp import FastMCP
from mcp.server.auth.settings import AuthSettings
from mcp.server.auth.provider import TokenVerifier, AccessToken

class MyVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        payload = validate_jwt(token, jwks_url)
        if "user" not in payload.get("permissions", []):
            return None
        return AccessToken(
            token=token,
            client_id=payload["azp"],
            subject=payload["sub"],
            scopes=payload.get("permissions", []),
            claims=payload,
        )

mcp = FastMCP(
    name="my-app",
    stateless_http=True,
    token_verifier=MyVerifier(),
    auth=AuthSettings(
        issuer_url="https://your-tenant.auth0.com",
        resource_server_url="https://example.com/mcp",
        required_scopes=["user"],
    ),
)
```

### Per-Tool Authentication

Use `securitySchemes` on tool descriptor:

```typescript
securitySchemes: [
  { type: "noauth" },  // Anonymous allowed
  { type: "oauth2", scopes: ["search.read"] }  // Auth optional
]

// Or require auth:
securitySchemes: [
  { type: "oauth2", scopes: ["docs.write"] }
]
```

### Authorization Providers

**Recommended:**
- Auth0 (RBAC, dynamic registration)
- Okta
- Azure AD
- Custom OAuth 2.1 servers

**Auth0 Setup:**
1. Create API in dashboard
2. Enable RBAC with permissions
3. Enable OIDC dynamic registration
4. Enable login connection for dynamic clients

---

## Storage & State Management

### Storage Strategies

#### 1. Bring Your Own Backend
- Authenticate via OAuth
- Use existing APIs
- Keep latency low (<300ms)
- Return sufficient structured content

**Considerations:**
- Data residency & compliance
- Rate limiting
- Schema versioning
- Backups and monitoring

#### 2. Component State (widgetState)
- Ephemeral UI state
- Travels with conversation
- Ideal for: selected tabs, filters, favorites
- Use `window.openai.setWidgetState()`

#### 3. Hybrid Approach
- Durable data in backend
- UI state in widgetState
- Include IDs in both for correlation

### State Contract

```typescript
// Read initial state
const initial = window.openai?.widgetState ?? window.openai?.toolOutput;

// Update state
await window.openai?.setWidgetState({
  __v: 1,
  favorites: [...],
  filters: {...}
});
```

### Handling Conflicts

- Refresh via follow-up tool call
- Explain changes in chat transcript
- Merge strategies for concurrent edits

---

## Custom UI Components

### window.openai API

#### Data Access

```typescript
// Tool inputs and outputs
const toolInput = window.openai?.toolInput;
const toolOutput = window.openai?.toolOutput;

// Persisted state
const widgetState = window.openai?.widgetState;
```

#### State Persistence

```typescript
await window.openai?.setWidgetState({
  __v: 1,
  data: {...}
});
```

#### Trigger Actions

```typescript
// Call MCP tool
await window.openai?.callTool("tool_name", { arg: "value" });

// Send conversational follow-up
await window.openai?.sendFollowupTurn({
  prompt: "Draft an itinerary for my favorites"
});

// Request layout change
await window.openai?.requestDisplayMode({ mode: "fullscreen" });
```

#### Layout Globals

```typescript
window.openai.displayMode  // "inline" | "pip" | "fullscreen"
window.openai.maxHeight    // Available vertical space
window.openai.theme        // "light" | "dark"
window.openai.locale       // BCP 47 locale tag
```

#### Event Listeners

```typescript
// Listen for global changes
window.addEventListener("openai:set_globals", (e) => {
  // Handle theme, layout changes
});

// Listen for tool responses
window.addEventListener("openai:tool_response", (e) => {
  // Handle background tool completions
});
```

### Component Scaffolding

**Project Structure:**
```
app/
  server/              # MCP server (Python/Node)
  web/                 # Component source
    package.json
    tsconfig.json
    src/
      component.tsx
    dist/
      component.js     # Build output
```

**Dependencies:**
```bash
npm install react@^18 react-dom@^18
npm install -D typescript esbuild
```

### React Component Pattern

```typescript
import React from "react";
import { createRoot } from "react-dom/client";

function MyApp() {
  const toolOutput = window.openai?.toolOutput;
  const [state, setState] = useWidgetState(toolOutput);
  
  const handleAction = async () => {
    await window.openai?.callTool("refresh", {});
  };
  
  return (
    <div>
      {/* Your UI */}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<MyApp />);
```

### Helper Hooks

```typescript
// Subscribe to global changes
export function useOpenAiGlobal<K extends keyof WebplusGlobals>(
  key: K
): WebplusGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        if (event.detail.globals[key] !== undefined) {
          onChange();
        }
      };
      window.addEventListener("openai:set_globals", handleSetGlobal);
      return () => window.removeEventListener("openai:set_globals", handleSetGlobal);
    },
    () => window.openai[key]
  );
}

// Persist widget state
export function useWidgetState<T>(defaultState: T) {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState");
  const [widgetState, _setWidgetState] = useState(
    widgetStateFromWindow ?? defaultState
  );
  
  const setWidgetState = useCallback((state) => {
    _setWidgetState(state);
    window.openai.setWidgetState(state);
  }, []);
  
  return [widgetState, setWidgetState];
}
```

### Bundling

```json
{
  "scripts": {
    "build": "esbuild src/component.tsx --bundle --format=esm --outfile=dist/component.js"
  }
}
```

### Navigation (React Router)

```typescript
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/detail/:id" element={<DetailView />} />
      </Routes>
    </BrowserRouter>
  );
}

// Programmatic navigation
const navigate = useNavigate();
navigate(`/detail/${id}`, { replace: false });
```

---

## Security & Privacy

### Principles

1. **Least Privilege** - Minimal scopes and permissions
2. **Explicit Consent** - Clear user understanding
3. **Defense in Depth** - Assume malicious inputs

### Data Handling

**Structured Content:**
- Include only necessary data
- Never embed secrets/tokens
- Redact PII in logs

**Storage:**
- Define retention policies
- Honor deletion requests
- Publish privacy policy

**Logging:**
- Use correlation IDs
- Redact sensitive data
- Avoid storing raw prompts

### Prompt Injection Mitigation

- Review tool descriptions regularly
- Validate all inputs server-side
- Require confirmation for destructive actions
- Test with injection attempts

### Network Access

**Component (iframe):**
- Sandboxed with strict CSP
- No privileged browser APIs
- Fetch allowed per CSP
- Domain allowlisting available

**Server:**
- No restrictions (normal best practices)
- TLS verification
- Timeouts and retries

### Operational Security

- Security reviews before launch
- Monitor anomalous traffic
- Alert on auth failures
- Keep dependencies patched

---

## Metadata Optimization

### Why Metadata Matters

Model uses metadata to decide when to call your tool. Good metadata = better discovery.

### Golden Prompt Set

Create labeled dataset:
- **Direct prompts** - Explicit app mentions
- **Indirect prompts** - Outcome descriptions
- **Negative prompts** - Should NOT trigger

Document expected behavior for each.

### Metadata Best Practices

**Tool Name:**
```
domain.action_name
Example: calendar.create_event
```

**Description:**
```
"Use this when user wants to [action]. Do not use for [exclusions]."
```

**Parameters:**
- Describe each argument
- Include examples
- Use enums for constrained values

**Annotations:**
```typescript
annotations: {
  readOnlyHint: true  // For read-only tools
}
```

**App-Level:**
- Polished description
- High-quality icon
- Starter prompts
- Sample conversations

### Evaluation Process

1. Link connector in developer mode
2. Run golden prompt set
3. Track precision and recall
4. Revise descriptions iteratively
5. Change one field at a time
6. Log results with timestamps

### Production Monitoring

- Review analytics weekly
- Capture user feedback
- Schedule periodic replays
- Update after adding tools

---

## API Reference

### window.openai Properties

| Property | Type | Description |
|----------|------|-------------|
| `toolInput` | `object` | Arguments passed to tool |
| `toolOutput` | `object` | Structured content from tool |
| `widgetState` | `object` | Persisted component state |
| `displayMode` | `string` | Current layout mode |
| `maxHeight` | `number` | Available vertical space |
| `theme` | `string` | "light" or "dark" |
| `locale` | `string` | BCP 47 locale tag |

### window.openai Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setWidgetState` | `state: object` | `Promise<void>` | Persist state to host |
| `callTool` | `name: string, args: object` | `Promise<void>` | Invoke MCP tool |
| `sendFollowupTurn` | `{ prompt: string }` | `Promise<void>` | Insert chat message |
| `requestDisplayMode` | `{ mode: string }` | `Promise<void>` | Request layout change |

### Window Events

| Event | Detail | Description |
|-------|--------|-------------|
| `openai:set_globals` | `{ globals }` | Globals changed |
| `openai:tool_response` | `{ tool }` | Tool call completed |

### Tool Descriptor Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | ✅ | Human-readable name |
| `description` | `string` | ✅ | When to use this tool |
| `inputSchema` | `object` | ✅ | JSON Schema for inputs |
| `securitySchemes` | `array` | ❌ | Auth requirements |
| `annotations` | `object` | ❌ | Hints (readOnlyHint) |
| `_meta` | `object` | ❌ | Extended metadata |

### Tool Descriptor _meta Fields

| Field | Type | Description |
|-------|------|-------------|
| `openai/outputTemplate` | `string` | Resource URI for component |
| `openai/widgetAccessible` | `boolean` | Allow component→tool calls |
| `openai/toolInvocation/invoking` | `string` | Status text while running |
| `openai/toolInvocation/invoked` | `string` | Status text after completion |

### Tool Result Fields

| Field | Type | Description |
|-------|------|-------------|
| `structuredContent` | `object` | Data for model and component |
| `content` | `array` | Text/media for model |
| `_meta` | `object` | Component-only data |

### Resource _meta Fields

| Field | Type | Description |
|-------|------|-------------|
| `openai/widgetDescription` | `string` | Component summary for model |
| `openai/widgetPrefersBorder` | `boolean` | Render with border |
| `openai/widgetCSP` | `object` | CSP domains |
| `openai/widgetDomain` | `string` | Component subdomain |

---

## Developer Guidelines & Policies

### App Fundamentals

#### Purpose and Originality
- Serve clear purpose
- Own or have permission for IP
- No misleading/copycat designs
- No impersonation or spam
- Don't imply OpenAI endorsement

#### Quality and Reliability
- Predictable behavior
- Accurate and relevant results
- Clear error handling
- Thoroughly tested
- Low latency
- No betas/trials/demos

#### Metadata
- Clear, accurate names/descriptions
- Real screenshots only
- Obvious tool purposes
- Mark read vs write actions

#### Authentication
- Transparent flows
- Explicit permissions
- Strictly necessary data only
- Provide demo account credentials

### Safety

#### Usage Policies
- Comply with OpenAI usage policies
- Stay current with policy updates
- Previously approved apps can be removed

#### Appropriateness
- Suitable for ages 13-17
- No targeting under-13
- Mature (18+) coming later

#### Respect User Intent
- Address user's request directly
- No unrelated content
- No redirection attempts
- Minimal data collection

#### Fair Play
- No anti-competitive descriptions
- Accurate value representation
- Don't discourage other apps

### Third-Party Content

- Authorized access only
- Comply with third-party ToS
- No circumventing restrictions
- No API abuse

### Privacy

#### Privacy Policy
- Published and clear
- Explain data collection and use
- Accessible before install

#### Data Collection

**Minimization:**
- Gather only required data
- Specific, narrow inputs
- No "just in case" fields

**Sensitive Data:**
- ❌ No PCI data
- ❌ No PHI
- ❌ No government IDs
- ❌ No API keys/passwords

**Data Boundaries:**
- No raw location in input schema
- Use controlled side channels
- No full chat log reconstruction
- Operate on explicit snippets only

#### Transparency

- No surveillance/tracking
- No behavioral profiling
- Accurate action labels
- Mark write actions clearly
- Prevent data exfiltration

### Developer Verification

- All submissions verified
- Confirm identity/affiliation
- Provide support contact
- Keep info up to date

### After Submission

- Automated scans and reviews
- Feedback on rejection
- Appeal opportunities
- Inactive/unstable apps removed
- Resubmit for tool changes

---

## Implementation Checklist

### Phase 1: Planning

- [ ] Define app purpose and use cases
- [ ] Validate against good/poor use case criteria
- [ ] Choose appropriate display modes
- [ ] Plan data model and state management
- [ ] Identify authentication requirements
- [ ] Create golden prompt set

### Phase 2: MCP Server

- [ ] Set up MCP server (Python/Node)
- [ ] Define tool schemas with JSON Schema
- [ ] Implement tool handlers
- [ ] Add authentication (if needed)
- [ ] Configure protected resource metadata
- [ ] Test tool calls with MCP Inspector

### Phase 3: UI Components

- [ ] Scaffold React project
- [ ] Install dependencies
- [ ] Create component entry point
- [ ] Implement window.openai integration
- [ ] Add helper hooks
- [ ] Build component bundle
- [ ] Test in local environment

### Phase 4: Integration

- [ ] Register component resource in MCP
- [ ] Link outputTemplate to tools
- [ ] Test tool → component flow
- [ ] Implement state persistence
- [ ] Add error handling
- [ ] Test display mode transitions

### Phase 5: Polish

- [ ] Apply visual design guidelines
- [ ] Ensure accessibility compliance
- [ ] Optimize metadata for discovery
- [ ] Add loading states
- [ ] Implement analytics
- [ ] Write user documentation

### Phase 6: Security & Privacy

- [ ] Implement token verification
- [ ] Add input validation
- [ ] Configure CSP
- [ ] Write privacy policy
- [ ] Test prompt injection scenarios
- [ ] Set up monitoring

### Phase 7: Testing

- [ ] Test with golden prompt set
- [ ] Verify precision/recall
- [ ] Test on mobile and web
- [ ] Test light/dark themes
- [ ] Test error scenarios
- [ ] Load testing

### Phase 8: Submission

- [ ] Prepare app metadata
- [ ] Create screenshots
- [ ] Write descriptions
- [ ] Set up demo account
- [ ] Submit for review
- [ ] Address feedback

---

## Best Practices

### Tool Design

✅ **Do:**
- Use action-oriented names
- Write clear descriptions with examples
- Include "Do not use for..." exclusions
- Mark read-only tools explicitly
- Return stable IDs in structured content
- Keep tools focused and single-purpose

❌ **Don't:**
- Create overly broad tools
- Use vague descriptions
- Forget to validate inputs
- Return secrets in structured content
- Make tools that duplicate built-ins

### Component Design

✅ **Do:**
- Read widgetState first, fallback to toolOutput
- Persist state after meaningful changes
- Handle missing data gracefully
- Support light and dark themes
- Optimize bundle size
- Use semantic HTML

❌ **Don't:**
- Assume data is always present
- Create internal scrolling
- Replicate composer input
- Use custom fonts
- Override system colors
- Block user interactions

### Performance

✅ **Do:**
- Keep tool latency under 300ms
- Lazy load heavy dependencies
- Optimize images
- Use efficient data structures
- Cache when appropriate
- Monitor bundle size

❌ **Don't:**
- Make synchronous blocking calls
- Load unnecessary dependencies
- Fetch data on every render
- Create memory leaks
- Ignore error states

### Discovery

✅ **Do:**
- Test with golden prompt set
- Monitor precision/recall
- Iterate on metadata
- Track analytics
- Update descriptions regularly
- Include starter prompts

❌ **Don't:**
- Use generic descriptions
- Ignore negative prompts
- Change multiple fields at once
- Skip evaluation
- Forget to log changes

---

## Common Patterns

### Pattern: List with Favorites

```typescript
function ListApp() {
  const toolOutput = window.openai?.toolOutput;
  const [favorites, setFavorites] = useWidgetState([]);
  
  const toggleFavorite = async (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    
    await window.openai?.setWidgetState({
      __v: 1,
      favorites: newFavorites
    });
    setFavorites(newFavorites);
  };
  
  return (
    <div>
      {toolOutput?.items.map(item => (
        <Card key={item.id}>
          <h3>{item.title}</h3>
          <button onClick={() => toggleFavorite(item.id)}>
            {favorites.includes(item.id) ? "★" : "☆"}
          </button>
        </Card>
      ))}
    </div>
  );
}
```

### Pattern: Fullscreen with Navigation

```typescript
function FullscreenApp() {
  const displayMode = useOpenAiGlobal("displayMode");
  const navigate = useNavigate();
  
  useEffect(() => {
    if (displayMode !== "fullscreen") {
      window.openai?.requestDisplayMode({ mode: "fullscreen" });
    }
  }, [displayMode]);
  
  return (
    <div>
      <nav>
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/detail")}>Detail</button>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail" element={<Detail />} />
      </Routes>
    </div>
  );
}
```

### Pattern: Refresh Data

```typescript
function RefreshableList() {
  const [loading, setLoading] = useState(false);
  
  const refresh = async () => {
    setLoading(true);
    await window.openai?.callTool("refresh_list", {
      filter: currentFilter
    });
    setLoading(false);
  };
  
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.tool.name === "refresh_list") {
        setLoading(false);
      }
    };
    window.addEventListener("openai:tool_response", handler);
    return () => window.removeEventListener("openai:tool_response", handler);
  }, []);
  
  return (
    <div>
      <button onClick={refresh} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
      {/* List content */}
    </div>
  );
}
```

### Pattern: Theme-Aware Styling

```typescript
function ThemedComponent() {
  const theme = useOpenAiGlobal("theme");
  
  return (
    <div className={`app ${theme}`}>
      <style>{`
        .app.light { background: white; color: black; }
        .app.dark { background: #1a1a1a; color: white; }
      `}</style>
      {/* Content */}
    </div>
  );
}
```

---

## Troubleshooting

### Component Not Rendering

**Symptoms:** Tool executes but no UI appears

**Checks:**
- [ ] Is `_meta["openai/outputTemplate"]` set on tool?
- [ ] Does resource URI match registered resource?
- [ ] Is component bundle valid ESM?
- [ ] Are there console errors in iframe?
- [ ] Is CSP blocking resources?

### Tool Not Being Called

**Symptoms:** Model doesn't select your tool

**Checks:**
- [ ] Is app linked in ChatGPT?
- [ ] Is tool description action-oriented?
- [ ] Does prompt match tool's purpose?
- [ ] Are there conflicting tools?
- [ ] Test in developer mode

### Authentication Failing

**Symptoms:** 401 errors on tool calls

**Checks:**
- [ ] Is OAuth flow completing?
- [ ] Is token being sent in Authorization header?
- [ ] Is token verification logic correct?
- [ ] Are scopes matching?
- [ ] Check JWKS endpoint

### State Not Persisting

**Symptoms:** widgetState resets unexpectedly

**Checks:**
- [ ] Is `setWidgetState` being called?
- [ ] Is state serializable (no functions)?
- [ ] Are you awaiting the promise?
- [ ] Check for race conditions

### Display Mode Not Changing

**Symptoms:** `requestDisplayMode` has no effect

**Checks:**
- [ ] Is mode valid ("inline", "fullscreen", "pip")?
- [ ] Mobile may coerce PiP to fullscreen
- [ ] Host decides whether to honor request
- [ ] Check for errors in console

---

## Additional Resources

### Official Documentation
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

### Example Apps
- Pizzaz List - Ranked cards with favorites
- Pizzaz Carousel - Media-heavy horizontal scroller
- Pizzaz Map - Mapbox integration with fullscreen
- Pizzaz Album - Stacked gallery view
- Pizzaz Video - Video player with controls

### Tools
- esbuild - Fast bundler
- React Router - Client-side routing
- Auth0 - OAuth provider
- MCP Inspector - Local debugging

---

## Appendix: Screenshots Analysis

Based on the provided screenshots, here are key observations:

### Screenshot 1: Voxel Game (Activated & Moved PiP)
- Shows PiP mode with 3D voxel giraffe
- Demonstrates persistent floating window
- User can continue conversation while game runs
- Clean integration with chat interface

### Screenshot 2: Pizza App Examples
- **Left**: Playlist creation with themed songs
- **Middle**: Map view with restaurant pins
- **Right**: BeatBot music creation interface
- Shows variety of display modes and interactions
- Demonstrates rich media integration

### Screenshot 3: Mobile Pizza App Flow
- Four-screen progression showing conversational flow
- Inline cards with images and CTAs
- Detailed restaurant view with photos
- List view with ratings and descriptions
- Map integration for location context
- Demonstrates seamless mobile experience

### Screenshot 4: UI Anti-Patterns
- Shows what NOT to do:
  - Multiple views (tabs/navigation)
  - Deep navigation (drill-downs)
  - Redundant features (duplicate controls)
  - Vertical scroll (internal scrolling)

### Screenshot 5: Task Management Examples
- Shows dynamic layout capabilities
- Demonstrates simple direct edits
- Clean, minimal interface
- Focus on single clear actions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-07 | Initial comprehensive reference document |

---

## Document Maintenance

This is a **living document** that should be updated as:
- New features are added to Apps SDK
- Best practices evolve
- Implementation patterns emerge
- Policy changes occur
- Community feedback is received

**Update Process:**
1. Review changes from OpenAI documentation
2. Test new features and patterns
3. Update relevant sections
4. Increment version number
5. Document changes in version history

---

**End of Master Reference Document**
