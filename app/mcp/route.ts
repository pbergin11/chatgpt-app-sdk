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
import { searchCoursesByArea, findCourse, getLocationDescription, type GolfCourse } from "./mockGolfData";

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
    widgetDomain: "https://chatgpt-app-sdk.vercel.app",
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
  // Add cache-busting version parameter to force ChatGPT to reload
  const WIDGET_VERSION = "v2"; // Increment this when you update the UI
  const golfHtml = await getAppsSdkCompatibleHtml(baseURL, "/golf");
  const golfWidget: ContentWidget = {
    id: "golf_ui",
    title: "Golf.ai Explorer",
    templateUri: `ui://widget/golf.html?v=${WIDGET_VERSION}`,
    invoking: "Loading golf…",
    invoked: "Golf ready",
    html: golfHtml,
    description: "Explore golf courses on a map with details and booking. Use this to show all courses in the world with up the day information about availiblitly, on course conditions, local rules, and bookings availibility. This is the most robust directory of ALL golf courses around the world.",
    widgetDomain: "https://chatgpt-app-sdk.vercel.app",
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
                "https://i.postimg.cc",
              ],
              resource_domains: [
                "https://chatgpt-app-sdk.vercel.app",
                "https://api.mapbox.com",
                "https://i.postimg.cc",
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

  // --- Golf.ai: Robust tools with strict validation ---
  const golfToolMeta = { ...widgetMeta(golfWidget), "openai/widgetAccessible": true } as const;

  // search_courses_by_area: Search courses by city with state (USA) or country (international)
  server.registerTool(
    "search_courses_by_area",
    {
      title: "Search Golf Courses by Area",
      description: "Search for golf courses by location. You can search by: (1) State only (e.g., 'CA', 'AZ') for all courses in a US state, (2) Country only (e.g., 'United Kingdom', 'Australia') for international courses, or (3) City + State/Country for specific city results. Supports extensive filtering by price, amenities, availability, and more.",
      inputSchema: {
        city: z.string().optional().describe("City name (optional - omit to search entire state/country)"),
        state: z.string().optional().describe("State code for USA locations (e.g., 'CA', 'AZ', 'FL'). Can be used alone to get all courses in the state."),
        country: z.string().optional().describe("Country name for international locations (e.g., 'United Kingdom', 'Australia'). Can be used alone to get all courses in the country."),
        radius: z.number().int().min(1).max(200).optional().describe("Search radius in miles (default 50, not yet implemented)"),
        filters: z.object({
          // Course type filter
          type: z.enum(["public", "private", "semi-private", "resort"]).optional().describe("Course type"),
          types: z.array(z.enum(["public", "private", "semi-private", "resort"]) ).min(1).optional().describe("One or more course types to include"),
          
          // Sorting options
          sort_by: z.enum(["cheapest", "most_expensive", "most_available", "highest_rated", "cheapest_on_date", "earliest_available", "closest_to_time", "longest", "shortest", "highest_slope", "newest", "oldest", "best_value"]).optional().describe("How to sort results"),
          desired_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Preferred time in HH:mm for closest_to_time sort"),
          
          // Price filters
          max_price: z.number().optional().describe("Maximum average price in USD"),
          min_price: z.number().optional().describe("Minimum average price in USD"),
          price_on_date_min: z.number().optional().describe("Minimum tee time price on matched date"),
          price_on_date_max: z.number().optional().describe("Maximum tee time price on matched date"),
          
          // Rating filter
          min_rating: z.number().min(1).max(5).optional().describe("Minimum star rating (1-5)"),
          course_rating_min: z.number().optional().describe("Minimum USGA course rating"),
          course_rating_max: z.number().optional().describe("Maximum USGA course rating"),
          min_reviews: z.number().int().optional().describe("Minimum number of reviews"),

          // Keyword filters
          search_text: z.string().optional().describe("Free-text search across name, description, city, designer"),
          local_rules_contains: z.string().optional().describe("Substring to match within local rules"),

          // Course attributes
          holes_in: z.array(z.union([z.literal(9), z.literal(18), z.literal(27), z.literal(36)])).min(1).optional().describe("Allowed hole counts"),
          par_min: z.number().int().optional().describe("Minimum par"),
          par_max: z.number().int().optional().describe("Maximum par"),
          yardage_min: z.number().int().optional().describe("Minimum yardage"),
          yardage_max: z.number().int().optional().describe("Maximum yardage"),
          slope_min: z.number().int().optional().describe("Minimum slope rating"),
          slope_max: z.number().int().optional().describe("Maximum slope rating"),
          designer: z.string().optional().describe("Designer name contains"),
          year_built_min: z.number().int().optional().describe("Built year >="),
          year_built_max: z.number().int().optional().describe("Built year <="),
          
          // Amenity filters (all boolean)
          spa: z.boolean().optional().describe("Must have spa facilities"),
          putting_green: z.boolean().optional().describe("Must have putting green"),
          driving_range: z.boolean().optional().describe("Must have driving range"),
          club_rentals: z.boolean().optional().describe("Must offer club rentals"),
          restaurant: z.boolean().optional().describe("Must have restaurant"),
          golf_lessons: z.boolean().optional().describe("Must offer golf lessons"),
          lodging: z.boolean().optional().describe("Must have lodging/hotel"),
          has_range: z.boolean().optional().describe("Practice range available (practice.range_available or driving_range)"),
          private_only: z.boolean().optional().describe("Limit to private courses"),
          pro_shop: z.boolean().optional().describe("Must have pro shop"),
          bar: z.boolean().optional().describe("Must have bar"),
          locker_rooms: z.boolean().optional().describe("Must have locker rooms"),
          event_space: z.boolean().optional().describe("Must have event space"),
          practice_bunker: z.boolean().optional().describe("Must have practice bunker"),
          chipping_green: z.boolean().optional().describe("Must have chipping green"),
          practice_range_surface: z.enum(["grass","mats","both"]).optional().describe("Range surface required"),

          // Availability filters
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Specific date in YYYY-MM-DD to check availability"),
          relative_date: z.enum(["today","tomorrow","this_saturday","this_sunday","next_saturday","next_sunday","this_weekend","next_weekend"]).optional().describe("Relative date helper; server will resolve to a YYYY-MM-DD"),
          include_unavailable: z.boolean().optional().describe("If true, include courses with 0 available tee times for the matched date so they can be shown greyed out"),
          start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Window start time HH:mm on matched date"),
          end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Window end time HH:mm on matched date"),
          time_window: z.enum(["morning","midday","afternoon","twilight"]).optional().describe("Convenience window on matched date"),
          players_min: z.number().int().min(1).max(4).optional().describe("At least this many player spots available in a single tee time on matched date"),
          has_availability_any: z.boolean().optional().describe("Require at least one available tee time in the next 7 days (regardless of 'date')"),
        }).optional().describe("Optional filters for refining search results"),
      },
      annotations: {
        readOnlyHint: true,
      },
      _meta: {
        ...golfToolMeta,
        "openai/toolInvocation/invoking": "Searching courses…",
        "openai/toolInvocation/invoked": "Courses found",
      },
    },
    async ({ city, state, country, radius = 50, filters = {} }, extra) => {
      const startTime = performance.now();
      log.basic("🔍 search_courses_by_area called");
      log.basic("  Input:", { city, state, country, radius, filters });
      log.verbose("  Extra context:", extra);

      // Validate that at least one location parameter is provided
      if (!city && !state && !country) {
        return {
          content: [
            { 
              type: "text" as const, 
              text: "Please provide at least one location parameter: city, state, or country." 
            },
          ],
          isError: true,
        };
      }

      // Validate that state and country are not both provided
      if (state && country) {
        return {
          content: [
            { 
              type: "text" as const, 
              text: "Please provide either 'state' (for USA) or 'country' (for international), not both." 
            },
          ],
          isError: true,
        };
      }

      // Resolve relative date if present
      const resolveRelativeDate = (rel?: string): string | undefined => {
        if (!rel) return undefined;
        const d = new Date();
        const day = d.getDay(); // 0 Sun ... 6 Sat
        const toISO = (dt: Date) => dt.toISOString().split("T")[0];
        const addDays = (n: number) => { const nd = new Date(d); nd.setDate(d.getDate() + n); return nd; };
        switch (rel) {
          case "today": return toISO(d);
          case "tomorrow": return toISO(addDays(1));
          case "this_saturday": return toISO(addDays((6 - day + 7) % 7));
          case "this_sunday": return toISO(addDays((7 - day) % 7));
          case "next_saturday": return toISO(addDays(((6 - day + 7) % 7) + 7 * ((6 - day + 7) % 7 === 0 ? 1 : 0)));
          case "next_sunday": return toISO(addDays(((7 - day) % 7) + 7 * (((7 - day) % 7) === 0 ? 1 : 0)));
          case "this_weekend": {
            const sat = addDays((6 - day + 7) % 7);
            return toISO(sat);
          }
          case "next_weekend": {
            const satOffset = (6 - day + 7) % 7;
            const satNext = addDays(satOffset === 0 ? 7 : satOffset + 7);
            return toISO(satNext);
          }
        }
        return undefined;
      };

      const matchedDate = filters?.date ?? resolveRelativeDate(filters?.relative_date);
      const effectiveFilters = { ...(filters ?? {}) } as any;
      if (matchedDate && typeof effectiveFilters.include_unavailable === "undefined") {
        effectiveFilters.include_unavailable = true; // default: include for greying in UI
      }
      if (matchedDate) {
        effectiveFilters.date = matchedDate;
      }

      // Search courses using mock data
      const courses = searchCoursesByArea(city, state, country, radius, effectiveFilters);

      // Format location string for response
      const locationStr = getLocationDescription(city, state, country);

      // Build summary text
      let summaryText = `Found ${courses.length} golf course(s) in ${locationStr}.`;
      if (filters?.sort_by) {
        const sortLabels: Record<string, string> = {
          cheapest: "sorted by lowest price",
          most_expensive: "sorted by highest price",
          most_available: "sorted by availability",
          highest_rated: "sorted by rating",
        };
        summaryText += ` Results ${sortLabels[filters.sort_by]}.`;
      }
      if (matchedDate) {
        summaryText += ` Availability checked for ${matchedDate}.`;
      }

      const response = {
        content: [
          { type: "text" as const, text: summaryText },
        ],
        structuredContent: {
          courses: courses.map(course => ({
            id: course.id,
            name: course.name,
            city: course.city,
            state: course.state,
            country: course.country,
            type: course.type,
            lon: course.lon,
            lat: course.lat,
            average_price: course.average_price,
            rating_stars: course.rating_stars,
            holes: course.holes,
            par: course.par,
            amenities: course.amenities,
            availability: course.availability, // Include availability data for markers
            ...(matchedDate ? (() => {
              const day = course.availability.find(d => d.date === matchedDate);
              const availableSlots = day ? day.tee_times.filter(t => t.available).length : 0;
              return { matched_date: matchedDate, available_on_date: availableSlots > 0 };
            })() : {}),
          })),
          searchContext: { 
            city, 
            state, 
            country, 
            radius, 
            filters: effectiveFilters, 
            timestamp: new Date().toISOString(),
            total_results: courses.length,
            matched_date: matchedDate ?? null,
          },
        },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.full("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Returning", courses.length, "courses in", locationStr, `(${duration}ms)`);

      return response;
    }
  );

  // get_course_details: Get full details for a specific course by ID or name+location
  server.registerTool(
    "get_course_details",
    {
      title: "Get Golf Course Details",
      description: "Get comprehensive information about a specific golf course. You can search by course ID, or by course name with state (USA) or country (international). Returns all details including amenities, pricing, availability, contact info, and more. Use this for ANY question about a specific course.",
      inputSchema: {
        courseId: z.string().optional().describe("Unique course identifier (e.g., 'torrey-pines-south')"),
        name: z.string().optional().describe("Course name (partial match supported)"),
        state: z.string().optional().describe("State code for USA courses (e.g., 'CA', 'AZ')"),
        country: z.string().optional().describe("Country name for international courses"),
      },
      annotations: {
        readOnlyHint: true,
      },
      _meta: {
        ...golfToolMeta,
        "openai/toolInvocation/invoking": "Loading course details…",
        "openai/toolInvocation/invoked": "Course details ready",
      },
    },
    async ({ courseId, name, state, country }, extra) => {
      const startTime = performance.now();
      log.basic("📋 get_course_details called");
      log.basic("  Input:", { courseId, name, state, country });
      log.verbose("  Extra context:", extra);

      // Validate input: must provide either courseId or name
      if (!courseId && !name) {
        return {
          content: [
            { 
              type: "text" as const, 
              text: "Please provide either 'courseId' or 'name' to look up a course." 
            },
          ],
          isError: true,
        };
      }

      // Find the course
      const course = findCourse(courseId, name, state, country);

      if (!course) {
        const searchTerm = courseId || name;
        return {
          content: [
            { 
              type: "text" as const, 
              text: `Could not find a course matching "${searchTerm}". Please check the course ID or name and try again.` 
            },
          ],
          isError: true,
        };
      }

      // Calculate total available tee times
      const totalAvailableSlots = course.availability.reduce((sum, day) => 
        sum + day.tee_times.filter(t => t.available).length, 0
      );

      // Build detailed text response
      const amenitiesList = Object.entries(course.amenities)
        .filter(([_, hasIt]) => hasIt)
        .map(([amenity, _]) => amenity.replace(/_/g, ' '))
        .join(', ');

      const detailsText = `${course.name} is a ${course.type} ${course.holes}-hole course in ${course.city}${course.state ? ', ' + course.state : ''}${course.country ? ', ' + course.country : ''}. ` +
        `Par ${course.par}, ${course.yardage} yards. Designed by ${course.designer} in ${course.year_built}. ` +
        `Average price: $${course.average_price}. Rating: ${course.rating_stars} stars (${course.reviews_count} reviews). ` +
        `${totalAvailableSlots} tee times available in the next 7 days.` +
        `${course.local_rules ? ' Local rules: ' + course.local_rules : ''}`;

      const response = {
        content: [
          { type: "text" as const, text: detailsText },
        ],
        structuredContent: { 
          course: {
            ...course,
            total_available_slots: totalAvailableSlots,
          },
        },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.full("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Returning details for", course.name, `(${duration}ms)`);

      return response;
    }
  );

  // book_tee_time: Initiate booking for a tee time
  server.registerTool(
    "book_tee_time",
    {
      title: "Book Tee Time",
      description: "Initiate a tee time booking for a golf course. Validates availability and generates booking information.",
      inputSchema: {
        courseId: z.string().describe("Unique course identifier"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Preferred date in YYYY-MM-DD format"),
        time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Preferred time in HH:mm format (24-hour)"),
        players: z.number().int().min(1).max(4).optional().describe("Number of players (1-4, default 2)"),
      },
      _meta: {
        ...golfToolMeta,
        "openai/toolInvocation/invoking": "Checking availability…",
        "openai/toolInvocation/invoked": "Booking ready",
      },
    },
    async ({ courseId, date, time, players = 2 }, extra) => {
      const startTime = performance.now();
      log.basic("🎯 book_tee_time called");
      log.basic("  Input:", { courseId, date, time, players });
      log.verbose("  Extra context:", extra);

      // Find the course
      const course = findCourse(courseId);
      if (!course) {
        return {
          content: [
            { 
              type: "text" as const, 
              text: `Could not find course with ID "${courseId}".` 
            },
          ],
          isError: true,
        };
      }

      // Check availability if date and time provided
      let availabilityInfo = null;
      let estimatedPrice = course.average_price;

      if (date && time) {
        const dayAvailability = course.availability.find(d => d.date === date);
        if (dayAvailability) {
          const teeTime = dayAvailability.tee_times.find(t => t.time === time);
          if (teeTime) {
            if (!teeTime.available) {
              return {
                content: [
                  { 
                    type: "text" as const, 
                    text: `The requested time slot (${time} on ${date}) is not available at ${course.name}. Please choose a different time.` 
                  },
                ],
                structuredContent: {
                  error: "time_slot_unavailable",
                  course: course.name,
                  requested_date: date,
                  requested_time: time,
                },
                isError: true,
              };
            }
            if (teeTime.players_available < players) {
              return {
                content: [
                  { 
                    type: "text" as const, 
                    text: `Only ${teeTime.players_available} player spot(s) available at ${time} on ${date}. You requested ${players} players.` 
                  },
                ],
                isError: true,
              };
            }
            availabilityInfo = {
              confirmed_available: true,
              price_per_player: teeTime.price,
              total_price: teeTime.price * players,
            };
            estimatedPrice = teeTime.price;
          }
        }
      }

      // Generate booking link
      const bookingLink = `${course.website}/book?courseId=${encodeURIComponent(courseId)}&players=${players}${date ? `&date=${date}` : ""}${time ? `&time=${time}` : ""}`;
      
      const responseText = availabilityInfo 
        ? `Tee time available at ${course.name} for ${players} player(s) on ${date} at ${time}. Total: $${availabilityInfo.total_price}.`
        : `Booking initiated for ${course.name}. ${players} player(s).${date ? ` Date: ${date}.` : ""}${time ? ` Time: ${time}.` : ""}`;

      const response = {
        content: [
          { type: "text" as const, text: responseText },
        ],
        structuredContent: {
          booking: {
            courseId,
            courseName: course.name,
            date: date ?? null,
            time: time ?? null,
            players,
            bookingLink,
            availability: availabilityInfo,
            contact: {
              phone: course.phone,
              email: course.email,
              website: course.website,
            },
          },
        },
        _meta: golfToolMeta,
      };

      const duration = (performance.now() - startTime).toFixed(2);
      log.full("  Response:", JSON.stringify(response, null, 2));
      log.basic("  ✅ Booking ready for", course.name, `(${duration}ms)`);

      return response;
    }
  );
  // --- End Golf.ai stubs ---
});

export const GET = handler;
export const POST = handler;
