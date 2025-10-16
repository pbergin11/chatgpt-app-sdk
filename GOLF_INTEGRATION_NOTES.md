# Golf.ai MCP Integration Notes (Initial)

## What Changed

- **Added golf tools (stubs) in** `app/mcp/route.ts`:
  - `search_courses(location, radius?, filters?)` → returns demo `courses[]` and `searchContext`
  - `get_course_details(courseId)` → returns demo `course`
  - `book_tee_time(courseId, date?, time?, players?)` → returns `booking` with `bookingLink`
  - Tools are marked with `_meta["openai/widgetAccessible"] = true` and reuse existing widget template.
- **Updated widget UI in** `app/page.tsx` to render new `structuredContent` fields:
  - Renders `courses` list (top 5)
  - Renders `course` details card
  - Renders `booking` summary with link

## How It Works Now

- ChatGPT invokes a Golf tool → tool returns `structuredContent`
- `app/page.tsx` reads `window.openai.toolOutput` via `useWidgetProps()` and conditionally displays sections
- We are still using the existing home template (`ui://widget/content-template.html`). A dedicated golf template will come next.

## How to Test

1. Run locally:
   ```bash
   pnpm dev
   # or npm run dev
   ```
   Visit http://localhost:3000 to confirm the UI loads.

2. In ChatGPT (Connectors → your app `/mcp`):
   - Call: `search_courses` with `{ "location": "San Diego" }`
   - Call: `get_course_details` with `{ "courseId": "demo-1" }`
   - Call: `book_tee_time` with `{ "courseId": "demo-1", "players": 2 }`
   - The widget will render courses, details, and booking output inline.

## Next Steps (Prioritized)

1. **/golf UI shell**
   - New route `app/golf/page.tsx` with map + sidebar layout scaffold
   - Register dedicated resource `ui://widget/golf.html` targeting this route
2. **Mapbox integration**
   - Add Mapbox GL JS, client-side clustering, marker interactions
   - Persist viewport and selection in `widgetState`
3. **Schemas & data**
   - Refine Zod schemas (filters, details, booking)
   - Wire real data (geocoding, course DB) in tools
4. **Booking flow**
   - Validate public vs private
   - Collect preferences; return deep links (V1) then API integration (V2+)
5. **Metadata & security**
   - Add resource `_meta` (`widgetDescription`, `widgetPrefersBorder`, `widgetDomain`, `widgetCSP`)
   - Tighten CORS for production
6. **Docs & prompts**
   - Golden prompts, testing checklist, and README/ARCH updates

## Notes

- Keep the stack: Next.js 15, React 19, TypeScript, MCP (`@modelcontextprotocol/sdk`, `mcp-handler`), Zod, Tailwind.
- Widget state is visible to the model; keep payloads compact (<~4k tokens).
- Tools callable from the widget require `_meta["openai/widgetAccessible"] = true`.
