# Golf Course Search & Booking App - Project Overview (Next.js)

**Project Name:** Golf.ai ChatGPT App  
**Version:** 1.0 (Demo Build)  
**Tech Stack:** Next.js 15 + TypeScript + MCP  
**Last Updated:** 2025-10-15  
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision](#project-vision)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [User Experience Flow](#user-experience-flow)
6. [Success Criteria](#success-criteria)
7. [Project Phases](#project-phases)
8. [Related Documentation](#related-documentation)

---

## Executive Summary

### What We're Building

A conversational golf course discovery and booking application that lives inside ChatGPT. Users can naturally search for golf courses, explore them on an interactive map, get detailed course information, and initiate tee time bookings—all through natural conversation combined with rich UI interactions.

### Core Value Proposition

**For Golfers:**
- Find courses through natural conversation ("show me challenging courses with spas near San Diego")
- Explore courses visually on an interactive map
- Get detailed course information without leaving ChatGPT
- Book tee times at public courses seamlessly

**For Golf Courses:**
- Increased discoverability through ChatGPT's massive user base
- Direct booking pipeline from search to reservation
- Rich course information presentation

### Why ChatGPT Apps?

Traditional golf course search requires:
1. Opening a separate app/website
2. Filling out search forms
3. Browsing through lists
4. Clicking through to booking sites

**With our ChatGPT app:**
1. User asks naturally: "Find golf courses near me with spas"
2. Interactive map appears inline with conversation
3. User explores visually or asks follow-up questions
4. Booking initiated directly from the interface

---

## Project Vision

### Long-Term Vision (Beyond V1)

**Phase 1 (V1 - Demo Build):** Search, map visualization, basic booking  
**Phase 2:** Advanced filtering, reviews, ratings, real-time availability  
**Phase 3:** Trip planning, multi-course itineraries, social features  
**Phase 4:** Personalized recommendations, AI caddy, course conditions

### What Makes This Unique

1. **Conversational Discovery** - No forms, just natural language
2. **Context-Aware** - Remembers what you're looking at, your preferences
3. **Seamless Integration** - No app switching, lives in ChatGPT
4. **Visual + Conversational** - Best of both worlds (map + chat)

---

## Core Features

### V1 Scope (What We're Building Now)

#### 1. Search & Discovery

**Natural Language Search:**
- "Show me golf courses near San Diego"
- "Find public courses with spas in Los Angeles"
- "What courses are near me?"
- "Show me Pebble Beach Golf Links"

**Search Capabilities:**
- Location-based (city, region, zip code)
- Course name search
- Basic filters (public/private, difficulty, amenities)
- Radius-based search (default 50 miles)

**User Location:**
- ChatGPT context-based (user mentions location)
- Explicit location input when "near me" is used
- No automatic GPS access (privacy-first)

#### 2. Interactive Map

**Map Features:**
- Mapbox GL JS integration
- Client-side clustering (15-20k courses)
- Course markers with click interactions
- Smooth pan/zoom animations
- Viewport-aware course list

**Clustering Behavior:**
- Clusters at low zoom (country/state view)
- Individual markers at high zoom (city view)
- Click cluster → expand to show courses
- Click marker → show course details

**Map Interactions:**
- Click course marker → open detail inspector
- Pan/zoom → update sidebar course list
- Sidebar course click → fly to course on map
- Map state persists in widget state

#### 3. Course Information

**Basic Info (Always Shown):**
- Course name
- City, state
- Course type (public/private/semi-private)
- Distance from search center

**Detailed Info (Inspector View):**
- Full description
- Contact information (phone, website)
- Number of holes
- Difficulty rating
- Amenities (spa, restaurant, pro shop)
- Booking availability (public courses)

**Information Sources:**
- Course database (your existing data)
- Course ID-based lookup (preferred)
- Name + location fallback

#### 4. Booking Flow

**Booking Triggers:**
- Button in course inspector
- Chat command: "Book a tee time at [course name]"
- Follow-up: "Book a tee time there" (context-aware)

**Booking Process (V1):**
1. User initiates booking
2. System validates course is public/bookable
3. Collect preferences (date, time, players)
4. Return booking link or instructions
5. (V2+: Direct API integration)

**Context Passing:**
- Selected course tracked in widget state
- Booking preferences saved as draft
- Follow-up questions understand context

#### 5. Widget State Management

**What We Track:**

```typescript
interface GolfWidgetState {
  __v: 1;
  
  // Current selection
  selectedCourse?: {
    id: string;
    name: string;
    location: string;
  };
  
  // Map viewport
  viewport: {
    center: [number, number];
    zoom: number;
  };
  
  // Search context
  searchContext?: {
    location: string;
    filters: Record<string, any>;
    timestamp: number;
  };
  
  // User preferences
  favorites?: string[];
  
  // Draft booking
  draftBooking?: {
    courseId: string;
    date?: string;
    time?: string;
    players?: number;
  };
  
  // Interaction history
  recentlyViewed?: Array<{
    courseId: string;
    timestamp: number;
  }>;
}
```

**Why Widget State Matters:**

1. **Enables Follow-up Questions:**
   - User: "Tell me more about this course" → System knows which course
   - User: "Does it have a spa?" → Context from widget state

2. **Persists User Journey:**
   - Map viewport preserved when scrolling away
   - Selected course remembered across conversation
   - Favorites persist throughout session

3. **Improves UX:**
   - No re-entering information
   - Seamless multi-turn interactions
   - Personalized experience

**Critical Understanding:**
- Widget state is **component-side storage**
- ChatGPT **doesn't automatically see it**
- Must **explicitly pass context** when calling tools
- Used for UI state, preferences, and selections

### Out of Scope (V2+)

Features we're **not** building in V1:

- ❌ Advanced filter UI (sliders, checkboxes)
- ❌ Course reviews and ratings
- ❌ Price comparison
- ❌ Multi-course trip planning
- ❌ Real-time tee time availability
- ❌ In-app payment processing
- ❌ User accounts (use widget state instead)
- ❌ Course photo galleries (thumbnail only)
- ❌ Weather integration
- ❌ Course condition reports

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│         ChatGPT Interface               │
│  User: "Show golf courses near me"      │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Model Context Protocol (MCP)           │
│  - Evaluates available tools            │
│  - Selects appropriate tool             │
│  - Generates arguments                  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  MCP Server (Next.js API Routes)        │
│  Tools:                                 │
│  - search_courses                       │
│  - get_course_details                   │
│  - book_tee_time                        │
│                                         │
│  Returns:                               │
│  - structuredContent (data)             │
│  - content (text response)              │
│  - _meta (widget resource)              │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  React Component (Sandboxed iframe)     │
│  - Reads window.openai.toolOutput       │
│  - Renders Mapbox map                   │
│  - Shows course markers                 │
│  - Displays sidebar/carousel            │
│  - Manages widget state                 │
│  - Calls tools via window.openai        │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Your Backend Services                  │
│  - Course database                      │
│  - Geocoding API                        │
│  - Booking API (V2+)                    │
└─────────────────────────────────────────┘
```

### Data Flow

**Search Flow:**
```
1. User: "Show golf courses in San Diego"
   ↓
2. Model selects: search_courses tool
   ↓
3. Tool arguments: { location: "San Diego" }
   ↓
4. Next.js API Route (/api/mcp/tools/search_courses):
   - Geocodes "San Diego" → [lat, lng]
   - Queries database for courses
   - Formats as GeoJSON
   - Returns structured content + widget resource
   ↓
5. ChatGPT renders component inline
   ↓
6. Component (Server Component + Client Component):
   - Reads toolOutput (GeoJSON courses)
   - Initializes Mapbox map
   - Adds course markers
   - Renders sidebar with course list
   - Saves viewport to widget state
   ↓
7. User interacts with map/sidebar
   ↓
8. Component updates widget state
```

**Detail View Flow:**
```
1. User clicks course marker OR asks "Tell me about Pebble Beach"
   ↓
2. Component OR Model calls: get_course_details
   ↓
3. Tool arguments: { course_id: "pebble-beach" }
   ↓
4. Next.js API Route:
   - Fetches full course details
   - Returns detailed information
   ↓
5. Component:
   - Opens inspector panel
   - Shows course details
   - Saves selection to widget state
   ↓
6. User can ask follow-up questions
   - "Does it have a spa?"
   - Component passes course_id from widget state
```

**Booking Flow:**
```
1. User clicks "Book Tee Time" OR says "Book a tee time there"
   ↓
2. Component OR Model calls: book_tee_time
   ↓
3. Tool arguments: {
     course_id: "pebble-beach",
     date: "2025-10-15",
     time: "10:00",
     players: 2
   }
   ↓
4. Next.js API Route:
   - Validates course is bookable
   - (V1) Returns booking link/instructions
   - (V2+) Integrates with booking API
   ↓
5. ChatGPT presents next steps to user
```

### Technology Stack

**Core Framework:**
- **Next.js:** 15.5.4 - React framework with App Router, Server Components, and API routes
- **React:** 19.1.0 - UI library
- **React DOM:** 19.1.0 - React renderer for web
- **TypeScript:** 5 - Type-safe JavaScript

**MCP Integration:**
- **@modelcontextprotocol/sdk:** ^1.20.0 - Official Model Context Protocol SDK
- **mcp-handler:** ^1.0.2 - Helper library for creating MCP servers in Next.js

**Validation & Schema:**
- **Zod:** 3.24.2 - TypeScript-first schema validation for tool input schemas

**Styling:**
- **TailwindCSS:** 4 - Utility-first CSS framework
- **@tailwindcss/postcss:** ^4 - PostCSS plugin for Tailwind
- **PostCSS:** - CSS transformation tool

**Fonts:**
- **Geist Sans:** - Modern sans-serif font from Vercel
- **Geist Mono:** - Monospace font from Vercel

**Map & UI Libraries:**
- **Mapbox GL JS:** - Interactive map rendering
- **Lucide React:** - Icon library
- **Framer Motion:** - Animation library (optional)

**Build Tools:**
- **Turbopack:** - Next.js's fast bundler (used in dev and build scripts)
- **TypeScript Compiler:** - Type checking

**Runtime Environment:**
- **Node.js:** 20+ - JavaScript runtime
- **pnpm:** 10.14.0 - Fast, disk space efficient package manager (also supports npm)

**Infrastructure:**
- **Component Hosting:** Vercel or static CDN
- **MCP Server:** Next.js API routes (serverless or Node.js server)
- **Database:** Your existing course database
- **APIs:** Mapbox, Geocoding

---

## User Experience Flow

### Primary User Journeys

#### Journey 1: Location-Based Search

```
User: "Show me golf courses near San Diego"
  ↓
[Map widget appears inline]
  ↓
User sees:
- Map centered on San Diego
- Course markers clustered
- Sidebar with course list (34 courses)
  ↓
User clicks cluster
  ↓
Map zooms in, shows individual courses
  ↓
User clicks course marker
  ↓
Inspector panel slides in with details
  ↓
User: "Does this course have a spa?"
  ↓
ChatGPT: "Yes, Torrey Pines has a full-service spa..."
```

#### Journey 2: Specific Course Lookup

```
User: "Tell me about Pebble Beach Golf Links"
  ↓
[Map widget appears, zoomed to Pebble Beach]
  ↓
Inspector panel open with course details
  ↓
User: "Can I book a tee time?"
  ↓
ChatGPT: "Yes! Pebble Beach is public. What date works for you?"
  ↓
User: "Next Saturday at 10am for 2 players"
  ↓
[Booking initiated]
  ↓
ChatGPT: "Great! Here's the booking link..."
```

#### Journey 3: Filtered Search

```
User: "Find public courses with spas in Los Angeles under $200"
  ↓
[Map widget with filtered results]
  ↓
User sees:
- 8 courses matching criteria
- Filtered markers on map
- Sidebar shows only matching courses
  ↓
User: "Show me the highest rated one"
  ↓
Map flies to top-rated course
  ↓
Inspector opens with details
```

#### Journey 4: Follow-up Questions

```
User: "Show golf courses in San Francisco"
  ↓
[Map widget appears]
  ↓
User clicks course
  ↓
[Inspector opens]
  ↓
User: "How difficult is this course?"
  ↓
ChatGPT: "Lincoln Park Golf Course is rated as moderate difficulty..."
  ↓
User: "What about the one next to it?"
  ↓
[Map pans to adjacent course, inspector updates]
  ↓
ChatGPT: "Presidio Golf Course is rated as challenging..."
```

### Display Modes

#### Inline Mode (Default)

**Layout:**
- Aspect ratio: 16:9 or auto-height
- Map with course markers
- Bottom carousel (mobile) or sidebar (desktop)
- Expand button to fullscreen

**Use Cases:**
- Quick search results
- Browsing 3-5 courses
- Mobile viewing

**Constraints:**
- Max 2 primary actions
- No internal scrolling
- Composer always visible

#### Fullscreen Mode

**Layout:**
- Full viewport height
- Left sidebar (desktop) with scrollable course list
- Map takes remaining space
- Right inspector panel for details
- Composer overlay at bottom

**Use Cases:**
- Exploring many courses
- Detailed comparison
- Desktop experience

**Features:**
- Full map controls
- Scrollable course list
- Rich inspector panel
- Conversational prompts work

---

## Success Criteria

### V1 is Successful If:

**Functional Requirements:**
1. ✅ Users can search courses by location naturally
2. ✅ Map renders 1000+ courses smoothly with clustering
3. ✅ Clicking a course shows details in <500ms
4. ✅ Users can initiate booking at public courses
5. ✅ Follow-up questions work with context
6. ✅ Works in inline and fullscreen modes
7. ✅ Mobile and desktop layouts are responsive

**Performance Requirements:**
1. ✅ Initial map load: <2s on cable, <5s on 3G
2. ✅ Smooth panning/zooming (>45 FPS)
3. ✅ Course detail load: <500ms
4. ✅ Tool response time: <300ms average
5. ✅ Bundle size: <500KB gzipped

**User Experience Requirements:**
1. ✅ Natural conversation flow
2. ✅ Intuitive map interactions
3. ✅ Clear visual hierarchy
4. ✅ Accessible (WCAG AA)
5. ✅ Error states handled gracefully

**Discovery Requirements:**
1. ✅ Model selects correct tool 90%+ of time
2. ✅ Handles variations in phrasing
3. ✅ Understands context from conversation
4. ✅ Provides helpful suggestions

---

## Project Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic search and map visualization

**Deliverables:**
- [ ] Next.js 15 project setup with App Router
- [ ] MCP server setup with `@modelcontextprotocol/sdk` and `mcp-handler`
- [ ] API route: `/api/mcp/tools/search_courses`
- [ ] Course database integration
- [ ] React component with Mapbox
- [ ] Basic course markers (no clustering yet)
- [ ] Simple course list sidebar
- [ ] Widget state persistence
- [ ] Local testing setup with Next.js dev server

**Success Metric:** Can search and see courses on map

---

### Phase 2: Clustering & Details (Week 2)
**Goal:** Rich interactions and course details

**Deliverables:**
- [ ] Client-side clustering implementation
- [ ] Course inspector panel
- [ ] API route: `/api/mcp/tools/get_course_details`
- [ ] Responsive mobile layout (carousel)
- [ ] Display mode support (inline/fullscreen)
- [ ] Smooth animations with Framer Motion
- [ ] Context-aware follow-ups
- [ ] Zod schema validation for tool inputs

**Success Metric:** Can explore courses and get details naturally

---

### Phase 3: Booking & Filters (Week 3)
**Goal:** Complete booking flow and filtering

**Deliverables:**
- [ ] API route: `/api/mcp/tools/book_tee_time`
- [ ] Basic filter implementation
- [ ] Booking flow UI
- [ ] Context passing for bookings
- [ ] Error handling with proper TypeScript types
- [ ] Loading states
- [ ] OAuth setup (if needed)

**Success Metric:** Can book tee times end-to-end

---

### Phase 4: Polish & Launch (Week 4)
**Goal:** Production-ready quality

**Deliverables:**
- [ ] Animations and transitions
- [ ] Accessibility audit and fixes
- [ ] Performance optimization (bundle size, code splitting)
- [ ] Testing with golden prompts
- [ ] Metadata optimization
- [ ] Documentation
- [ ] Deployment to Vercel
- [ ] Monitoring setup (Vercel Analytics)

**Success Metric:** Ready for production launch

---