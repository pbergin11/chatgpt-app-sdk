/**
 * MCP Route - Golf.ai ChatGPT App
 * 
 * This file handles all MCP (Model Context Protocol) communication between ChatGPT and our server.
 * 
 * === DEBUGGING MCP COMMUNICATION ===
 * 
 * To log MCP requests/responses, set the LOG_MCP environment variable:
 *   - LOG_MCP=basic    → Log tool calls and basic info
 *   - LOG_MCP=full     → Log complete request/response payloads
 *   - LOG_MCP=verbose  → Log everything including metadata
 * 
 * Example in .env.local:
 *   LOG_MCP=full
 * 
 * Logs appear in:
 *   - Local dev: Terminal where `pnpm dev` is running
 *   - Vercel: Runtime logs in Vercel dashboard (Logs tab)
 * 
 * === MCP FLOW ===
 * 
 * 1. ChatGPT sends initialize request → Server responds with capabilities
 * 2. ChatGPT calls tools/list → Server returns available tools
 * 3. ChatGPT calls resources/list → Server returns widget templates
 * 4. User asks question → ChatGPT calls tool (e.g., search_courses)
 * 5. Server returns:
 *    - content: Text for ChatGPT to read
 *    - structuredContent: Data for the widget component
 *    - _meta: Metadata (widget template URI, CSP, etc.)
 * 6. ChatGPT renders widget iframe with structuredContent
 * 
 * === KEY CONCEPTS ===
 * 
 * - Tools: Functions ChatGPT can call (search_courses, get_course_details, etc.)
 * - Resources: Widget HTML templates (ui://widget/golf.html)
 * - structuredContent: Data visible to both ChatGPT and the widget
 * - _meta: Data only visible to the widget (not the model)
 * - CSP: Content Security Policy - whitelist domains for scripts/API calls
 */

import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// Logging configuration
const LOG_LEVEL = process.env.LOG_MCP || "none"; // none | basic | full | verbose
const shouldLog = (level: string) => {
  const levels = ["none", "basic", "full", "verbose"];
  return levels.indexOf(LOG_LEVEL) >= levels.indexOf(level);
};

const log = {
  basic: (...args: any[]) => shouldLog("basic") && console.log("[MCP]", ...args),
  full: (...args: any[]) => shouldLog("full") && console.log("[MCP]", ...args),
  verbose: (...args: any[]) => shouldLog("verbose") && console.log("[MCP]", ...args),
};

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");

  const contentWidget: ContentWidget = {
    id: "show_content",
    title: "Show Content",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading content...",
    invoked: "Content loaded",
    html: html,
    description: "Displays the homepage content",
    widgetDomain: "https://nextjs.org/docs",
  };
  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": contentWidget.widgetDomain,
          },
        },
      ],
    })
  );

  // --- Golf widget resource ---
  const golfHtml = await getAppsSdkCompatibleHtml(baseURL, "/golf");
  const golfWidget: ContentWidget = {
    id: "golf_ui",
    title: "Golf.ai Explorer",
    templateUri: "ui://widget/golf.html",
    invoking: "Loading golf…",
    invoked: "Golf ready",
    html: golfHtml,
    description: "Explore golf courses on a map with details and booking.",
    widgetDomain: "https://chatgpt.com",
  };
  server.registerResource(
    "golf-widget",
    golfWidget.templateUri,
    {
      title: golfWidget.title,
      description: golfWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": golfWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${golfWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": golfWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": golfWidget.widgetDomain,
            "openai/widgetCSP": {
              connect_domains: [
                "https://chatgpt-app-sdk.vercel.app",
                "https://api.mapbox.com",
                "https://events.mapbox.com",
              ],
              resource_domains: [
                "https://chatgpt-app-sdk.vercel.app",
                "https://api.mapbox.com",
              ],
            },
          },
        },
      ],
    })
  );

  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Fetch and display the homepage content with the name of the user",
      inputSchema: {
        name: z.string().describe("The name of the user to display on the homepage"),
      },
      _meta: widgetMeta(contentWidget),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: name,
          },
        ],
        structuredContent: {
          name: name,
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(contentWidget),
      };
    }
  );

  // --- Golf.ai: Initial tools (stubs) ---
  const golfToolMeta = { ...widgetMeta(golfWidget), "openai/widgetAccessible": true } as const;

  // search_courses: returns a minimal list of demo courses based on location (with coordinates)
  server.registerTool(
    "search_courses",
    {
      title: "Search Golf Courses",
      description: "Search for golf courses by location with optional radius and filters.",
      inputSchema: {
        location: z.string().describe("City/region or place name to search around"),
        radius: z.number().int().min(1).max(200).optional().describe("Search radius in miles (default 50)"),
        filters: z.record(z.any()).optional().describe("Optional filters (public/private, amenities, etc.)"),
      },
      _meta: golfToolMeta,
    },
    async ({ location, radius = 50, filters = {} }, extra) => {
      const startTime = performance.now();
      log.basic("🔍 search_courses called");
      log.basic("  Input:", { location, radius, filters });
      log.basic("  Extra context:", extra);

      // Stubbed demo data (replace with real DB + geocoding later)
      // Coordinates roughly around San Diego by default; in real impl, geocode location
      const base = { lon: -117.1611, lat: 32.7157 };
      const jitter = (n: number) => n + (Math.random() - 0.5) * 0.2;
      const courses = [
        {
          id: "demo-1",
          name: "Torrey Pines Golf Course",
          city: "La Jolla",
          state: "CA",
          type: "public",
          distance: 5,
          lon: -117.2517,
          lat: 32.8987,
        },
        {
          id: "demo-2",
          name: "Balboa Park Golf Course",
          city: "San Diego",
          state: "CA",
          type: "public",
          distance: 3,
          lon: -117.1461,
          lat: 32.7338,
        },
        {
          id: "demo-3",
          name: "Coronado Golf Course",
          city: "Coronado",
          state: "CA",
          type: "public",
          distance: 7,
          lon: -117.1783,
          lat: 32.6859,
        },
        {
          id: "demo-4",
          name: "Mission Bay Golf Course",
          city: "San Diego",
          state: "CA",
          type: "public",
          distance: 4,
          lon: -117.2264,
          lat: 32.7809,
        },
        {
          id: "demo-5",
          name: "Riverwalk Golf Club",
          city: "San Diego",
          state: "CA",
          type: "semi-private",
          distance: 8,
          lon: -117.1264,
          lat: 32.8409,
        },
        {
          id: "demo-6",
          name: "Carlton Oaks Golf Course",
          city: "Santee",
          state: "CA",
          type: "public",
          distance: 15,
          lon: -116.9739,
          lat: 32.8584,
        },
        {
          id: "demo-7",
          name: "Steele Canyon Golf Club",
          city: "Jamul",
          state: "CA",
          type: "semi-private",
          distance: 18,
          lon: -116.8764,
          lat: 32.7209,
        },
        {
          id: "demo-8",
          name: "The Crossings at Carlsbad",
          city: "Carlsbad",
          state: "CA",
          type: "public",
          distance: 25,
          lon: -117.3103,
          lat: 33.1581,
        },
        {
          id: "demo-9",
          name: "Aviara Golf Club",
          city: "Carlsbad",
          state: "CA",
          type: "private",
          distance: 28,
          lon: -117.2839,
          lat: 33.1092,
        },
        {
          id: "demo-10",
          name: "Maderas Golf Club",
          city: "Poway",
          state: "CA",
          type: "semi-private",
          distance: 20,
          lon: -117.0364,
          lat: 32.9628,
        },
        {
          id: "demo-11",
          name: "Salt Creek Golf Club",
          city: "Chula Vista",
          state: "CA",
          type: "public",
          distance: 12,
          lon: -117.0842,
          lat: 32.6401,
        },
        {
          id: "demo-12",
          name: "Eastlake Country Club",
          city: "Chula Vista",
          state: "CA",
          type: "private",
          distance: 14,
          lon: -117.0164,
          lat: 32.6209,
        },
      ];

      const response = {
        content: [
          { type: "text" as const, text: `Found ${courses.length} course(s) near ${location}.` },
        ],
        structuredContent: {
          courses,
          searchContext: { location, radius, filters, timestamp: new Date().toISOString() },
        },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.basic("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Returning", courses.length, "courses", `(${duration}ms)`);

      return response;
    }
  );

  // get_course_details: returns basic details for a course id (stub)
  server.registerTool(
    "get_course_details",
    {
      title: "Get Course Details",
      description: "Return detailed information for a specific golf course.",
      inputSchema: {
        courseId: z.string().describe("Unique course identifier"),
      },
      _meta: golfToolMeta,
    },
    async ({ courseId }, extra) => {
      const startTime = performance.now();
      log.basic("📋 get_course_details called");
      log.basic("  Input:", { courseId });
      log.basic("  Extra context:", extra);

      // Stubbed details; replace with DB lookup
      const details = {
        id: courseId,
        name: `Course ${courseId}`,
        description: "A beautiful demo course with ocean views.",
        holes: 18,
        type: "public",
        amenities: ["spa", "restaurant", "pro shop"],
        phone: "+1 (555) 010-0101",
        website: "https://example.com/courses/" + courseId,
      };

      const response = {
        content: [
          { type: "text" as const, text: `Details for course ${courseId}.` },
        ],
        structuredContent: { course: details },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.basic("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Returning details for", courseId, `(${duration}ms)`);

      return response;
    }
  );

  // book_tee_time: validates inputs and returns a booking link (stub)
  server.registerTool(
    "book_tee_time",
    {
      title: "Book Tee Time",
      description: "Initiate a tee time booking for a public course (stub).",
      inputSchema: {
        courseId: z.string().describe("Unique course identifier"),
        date: z.string().optional().describe("Preferred date (YYYY-MM-DD)"),
        time: z.string().optional().describe("Preferred time (HH:mm)"),
        players: z.number().int().min(1).max(8).optional().describe("Number of players"),
      },
      _meta: golfToolMeta,
    },
    async ({ courseId, date, time, players = 2 }, extra) => {
      const startTime = performance.now();
      log.basic("🎯 book_tee_time called");
      log.basic("  Input:", { courseId, date, time, players });
      log.basic("  Extra context:", extra);

      const bookingLink = `https://example.com/book/${encodeURIComponent(courseId)}?players=${players}${date ? `&date=${date}` : ""}${time ? `&time=${time}` : ""}`;
      
      const response = {
        content: [
          { type: "text" as const, text: `Booking link ready for ${courseId}.` },
        ],
        structuredContent: {
          booking: {
            courseId,
            date: date ?? null,
            time: time ?? null,
            players,
            bookingLink,
          },
        },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.basic("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Returning booking link", `(${duration}ms)`);

      return response;
    }
  );
  // --- End Golf.ai stubs ---
});

export const GET = handler;
export const POST = handler;
