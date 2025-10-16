# ChatGPT Apps SDK - Development Principles & Best Practices

This document outlines the fundamental principles and common pitfalls we've learned while building the Golf.ai ChatGPT App.

---

## 🎯 Core Principles

### 1. **Always Handle Null/Undefined State**

**Problem:** `useWidgetState` can return `null` or `undefined` on first render, especially in ChatGPT's iframe environment.

**Solution:** Use optional chaining and provide fallback values everywhere.

```typescript
// ❌ BAD - Will crash if state is null
const map = new mapboxgl.Map({
  center: state.viewport.center,
  zoom: state.viewport.zoom,
});

// ✅ GOOD - Safe with fallbacks
const map = new mapboxgl.Map({
  center: state?.viewport?.center ?? [-117.1611, 32.7157],
  zoom: state?.viewport?.zoom ?? 10,
});
```

**Key Areas to Check:**
- Map initialization
- Event handlers (onClick, onChange)
- State updates in `setState` callbacks
- Any property access on `state` object

---

### 2. **Content Security Policy (CSP) Must Include All External Domains**

**Problem:** ChatGPT blocks any external resources (images, APIs, fonts) not explicitly whitelisted in CSP.

**Solution:** Add ALL external domains to both `connect_domains` and `resource_domains` in your MCP server.

```typescript
"openai/widgetCSP": {
  connect_domains: [
    "https://your-app-domain.com",
    "https://api.mapbox.com",           // Mapbox API calls
    "https://events.mapbox.com",        // Mapbox analytics
    "https://i.postimg.cc",             // Image hosting
    // Add any other APIs you call
  ],
  resource_domains: [
    "https://your-app-domain.com",
    "https://api.mapbox.com",           // Mapbox tiles/resources
    "https://i.postimg.cc",             // Images
    // Add any CDNs, fonts, etc.
  ],
}
```

**Common External Resources:**
- Image hosting (Picsum, Postimg, Cloudinary, etc.)
- Map providers (Mapbox, Google Maps)
- Font CDNs (Google Fonts, Adobe Fonts)
- API endpoints
- Analytics services

---

### 3. **Cache Busting for Widget Updates**

**Problem:** ChatGPT aggressively caches widget HTML. UI changes don't appear even after deployment.

**Solution:** Use a version parameter in the widget URI and increment it with each UI update.

```typescript
// In app/mcp/route.ts
const WIDGET_VERSION = "v3"; // Increment this when you update the UI

const golfWidget: ContentWidget = {
  templateUri: `ui://widget/golf.html?v=${WIDGET_VERSION}`,
  // ...
};
```

**Deployment Workflow:**
1. Make UI changes
2. Increment `WIDGET_VERSION` (v1 → v2 → v3)
3. Deploy to Vercel
4. **Unlink and re-link** the app in ChatGPT settings
5. Test in a fresh conversation

---

### 4. **State Initialization Must Provide Complete Defaults**

**Problem:** Partial state initialization causes runtime errors when accessing nested properties.

**Solution:** Always provide complete default state structure.

```typescript
// ❌ BAD - Incomplete defaults
const [state, setState] = useWidgetState<GolfWidgetState>(() => ({
  __v: 1,
}));

// Later: state.viewport.center crashes!

// ✅ GOOD - Complete defaults
const [state, setState] = useWidgetState<GolfWidgetState>(() => ({
  __v: 1,
  viewport: { center: [-117.1611, 32.7157], zoom: 10 },
  selectedCourseId: undefined,
}));
```

**In setState callbacks:**
```typescript
// ❌ BAD - Unsafe non-null assertion
setState((prev) => ({ 
  ...prev, 
  selectedCourseId: id,
  viewport: state!.viewport // Crashes if state is null
}));

// ✅ GOOD - Safe fallback
setState((prev) => ({ 
  ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }),
  selectedCourseId: id,
}));
```

---

### 5. **Widget Domain Configuration**

**Problem:** Default sandbox domain may not work for all external services (e.g., API keys restricted by origin).

**Solution:** Configure a custom widget domain in your MCP server.

```typescript
const golfWidget: ContentWidget = {
  // ...
  widgetDomain: "https://chatgpt-app-sdk.vercel.app", // Your deployed domain
};
```

**In the resource registration:**
```typescript
_meta: {
  "openai/widgetDomain": golfWidget.widgetDomain,
  // This creates: https://chatgpt-app-sdk-vercel-app.web-sandbox.oaiusercontent.com
}
```

---

### 6. **Environment Variables for Tokens**

**Problem:** Hardcoded API keys in code are insecure and inflexible.

**Solution:** Use environment variables with proper fallbacks.

```typescript
// In component
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// In .env.local (never commit this file!)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

**Vercel Deployment:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_MAPBOX_TOKEN` with your token
3. Redeploy

---

### 7. **Dependency Arrays in useEffect**

**Problem:** Including unstable dependencies (like `state?.viewport`) causes infinite re-renders.

**Solution:** Only include primitive values or stable references.

```typescript
// ❌ BAD - Infinite loop if viewport changes
useEffect(() => {
  // Map initialization
}, [geojson, setState, state?.viewport, token]);

// ✅ GOOD - Stable dependencies only
useEffect(() => {
  // Map initialization
}, [geojson, setState, token]);
```

**Rule of Thumb:**
- Include: primitives, refs, stable functions
- Exclude: objects, arrays, computed values (unless memoized)

---

### 8. **Structured Content vs _meta**

**Problem:** Confusion about what data goes where in tool responses.

**Solution:** Follow this pattern:

```typescript
return {
  // Text for ChatGPT to read and respond to
  content: [
    { type: "text", text: `Found ${courses.length} courses near ${location}.` }
  ],
  
  // Data for BOTH ChatGPT and the widget
  // Keep this minimal - only what the model needs to understand
  structuredContent: {
    courses: courses.slice(0, 10), // Limit for the model
    searchContext: { location, radius, filters },
  },
  
  // Data ONLY for the widget (hidden from model)
  // Use this for full datasets, UI state, etc.
  _meta: {
    ...golfToolMeta,
    allCourses: courses, // Full list
    mapBounds: { /* ... */ },
  }
};
```

---

### 9. **Logging for Debugging**

**Problem:** Hard to debug issues in ChatGPT's iframe environment.

**Solution:** Use environment-based logging in your MCP server.

```typescript
// In .env.local
LOG_MCP=basic  // or 'full' or 'verbose'

// In app/mcp/route.ts
const LOG_LEVEL = process.env.LOG_MCP || "none";

log.basic("🔍 search_courses called");
log.basic("  Input:", { location, radius, filters });
log.basic("  ✅ Returning", courses.length, "courses");
```

**Check logs:**
- Local: Terminal where `pnpm dev` runs
- Vercel: Dashboard → Project → Logs tab

---

### 10. **Testing Workflow**

**Problem:** Changes don't appear or behave differently in ChatGPT vs local.

**Solution:** Test in both environments systematically.

**Local Testing (`localhost:3000`):**
```bash
pnpm dev
# Visit http://localhost:3000/golf
# Tests layout, styling, basic interactions
# Note: window.openai is undefined, so no real data
```

**ChatGPT Testing:**
1. Deploy to Vercel
2. Increment `WIDGET_VERSION`
3. Unlink and re-link app in ChatGPT
4. Start fresh conversation
5. Test with prompts: "Show me golf courses near San Diego"

---

## 🚨 Common Pitfalls

### 1. **Forgetting to Increment Widget Version**
- **Symptom:** UI changes don't appear in ChatGPT
- **Fix:** Increment `WIDGET_VERSION` and unlink/re-link

### 2. **CSP Blocking Resources**
- **Symptom:** Console errors: "Refused to load..."
- **Fix:** Add domain to both CSP arrays

### 3. **Null Reference Errors**
- **Symptom:** TypeError: Cannot read properties of null
- **Fix:** Add optional chaining (`?.`) and fallback values (`??`)

### 4. **Infinite Re-renders**
- **Symptom:** Browser freezes, React warnings
- **Fix:** Check useEffect dependencies, remove object/array deps

### 5. **State Not Persisting**
- **Symptom:** State resets between tool calls
- **Fix:** Ensure `useWidgetState` is called correctly, check `__v` field

---

## 📋 Pre-Deployment Checklist

Before deploying or testing in ChatGPT:

- [ ] All external domains added to CSP
- [ ] Environment variables set in Vercel
- [ ] Widget version incremented
- [ ] All state accesses use optional chaining
- [ ] No hardcoded API keys in code
- [ ] useEffect dependencies are stable
- [ ] Logging enabled for debugging
- [ ] Tested locally first
- [ ] Git committed and pushed
- [ ] Vercel deployment successful

---

## 🔧 Quick Reference

### Safe State Access Pattern
```typescript
// Always use this pattern
const value = state?.property?.nestedProperty ?? defaultValue;
```

### Safe setState Pattern
```typescript
setState((prev) => ({
  ...(prev ?? defaultState),
  newProperty: newValue,
}));
```

### CSP Update Pattern
```typescript
// Add to both arrays in app/mcp/route.ts
connect_domains: ["https://new-domain.com"],
resource_domains: ["https://new-domain.com"],
```

### Version Bump Pattern
```typescript
// In app/mcp/route.ts
const WIDGET_VERSION = "v4"; // Increment this
```

---

## 📚 Additional Resources

- **MCP Specification:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Apps SDK Docs:** See `APPS_SDK_MASTER_REFERENCE.md`
- **Architecture:** See `ARCHITECTURE.md`
- **Design System:** See `design_guide.md`

---

## 🎓 Key Takeaways

1. **Defensive Programming:** Always assume data might be null/undefined
2. **CSP is Strict:** Whitelist everything external
3. **Cache is Aggressive:** Version your widgets
4. **Test Both Environments:** Local and ChatGPT behave differently
5. **Log Everything:** You can't debug what you can't see

---

**Last Updated:** 2025-10-16  
**Version:** 1.0
