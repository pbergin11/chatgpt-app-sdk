import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

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
            "openai/cspMetadata": {
              "connect-src": ["https://api.mapbox.com", "https://events.mapbox.com"],
              "img-src": ["https://*.tiles.mapbox.com", "data:", "blob:"],
              "script-src": ["https://api.mapbox.com"],
              "worker-src": ["blob:"],
              "child-src": ["blob:"],
              "style-src": ["https://api.mapbox.com"],
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
    async ({ location, radius = 50, filters = {} }) => {
      // Stubbed demo data (replace with real DB + geocoding later)
      // Coordinates roughly around San Diego by default; in real impl, geocode location
      const base = { lon: -117.1611, lat: 32.7157 };
      const jitter = (n: number) => n + (Math.random() - 0.5) * 0.2;
      const courses = [
        {
          id: "demo-1",
          name: `Demo Course in ${location}`,
          city: location,
          state: "",
          type: "public",
          distance: 5,
          lon: jitter(base.lon),
          lat: jitter(base.lat),
        },
        {
          id: "demo-2",
          name: `Second Course in ${location}`,
          city: location,
          state: "",
          type: "semi-private",
          distance: 12,
          lon: jitter(base.lon),
          lat: jitter(base.lat),
        },
      ];

      return {
        content: [
          { type: "text", text: `Found ${courses.length} course(s) near ${location}.` },
        ],
        structuredContent: {
          courses,
          searchContext: { location, radius, filters, timestamp: new Date().toISOString() },
        },
        _meta: golfToolMeta,
      };
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
    async ({ courseId }) => {
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

      return {
        content: [
          { type: "text", text: `Details for course ${courseId}.` },
        ],
        structuredContent: { course: details },
        _meta: golfToolMeta,
      };
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
    async ({ courseId, date, time, players = 2 }) => {
      const bookingLink = `https://example.com/book/${encodeURIComponent(courseId)}?players=${players}${date ? `&date=${date}` : ""}${time ? `&time=${time}` : ""}`;
      return {
        content: [
          { type: "text", text: `Booking link ready for ${courseId}.` },
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
    }
  );
  // --- End Golf.ai stubs ---
});

export const GET = handler;
export const POST = handler;
