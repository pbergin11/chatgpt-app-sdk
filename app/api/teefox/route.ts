/**
 * TeeBox API Route
 * 
 * Fetches available tee times from TeeBox API
 */

import { NextRequest, NextResponse } from 'next/server';

export interface TeeTime {
  locationId: string;
  timezone: string;
  apptTime: string; // ISO 8601 format
  pricePerPatron: number; // Price in cents
  patrons: number;
  bookingUrl: string;
  holes: number;
}

export interface TeeFoxResponse {
  meta: {
    totalTeetimes: number;
    nextPageToken: string | null;
    coursesSearched: number;
    totalCourses: number;
    remainingCourses: number;
  };
  teetimes: TeeTime[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location_id = searchParams.get('location_id');
  const date = searchParams.get('date'); // YYYY-MM-DD format
  const patrons = searchParams.get('patrons'); // e.g., "[1,2,3,4]"
  const holes = searchParams.get('holes'); // e.g., "[9,18]"

  if (!location_id) {
    return NextResponse.json(
      { error: 'location_id is required' },
      { status: 400 }
    );
  }

  if (!date) {
    return NextResponse.json(
      { error: 'date is required (YYYY-MM-DD format)' },
      { status: 400 }
    );
  }

  const apiKey = process.env.TEEFOX_API;

  if (!apiKey) {
    console.error('TEEFOX_API key not found in environment variables');
    return NextResponse.json(
      { error: 'TeeBox API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Build URL with optional parameters
    const params = new URLSearchParams({
      location_id,
      date,
    });
    
    if (patrons) params.append('patrons', patrons);
    if (holes) params.append('holes', holes);
    
    const url = `https://api.teefox.golf/api/teetimes?${params.toString()}`;
    
    console.log(`[TeeBox] Fetching tee times: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // Handle 404 gracefully - course not found in TeeBox system
      if (response.status === 404) {
        console.log(`[TeeBox] Course not found: ${location_id}`);
        return NextResponse.json({
          meta: {
            totalTeetimes: 0,
            nextPageToken: null,
            coursesSearched: 0,
            totalCourses: 0,
            remainingCourses: 0,
          },
          teetimes: [],
        });
      }
      
      console.error(`[TeeBox] API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `TeeBox API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: TeeFoxResponse = await response.json();
    
    if (data.meta.totalTeetimes === 0) {
      console.log(`[TeeBox] No tee times found for ${location_id} on ${date}`);
      console.log('[TeeBox] Full API Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`[TeeBox] Found ${data.meta.totalTeetimes} tee times for ${location_id} on ${date}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[TeeBox] Error fetching tee times:', {
      location_id,
      date,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return empty result instead of error to prevent UI breaking
    return NextResponse.json({
      meta: {
        totalTeetimes: 0,
        nextPageToken: null,
        coursesSearched: 0,
        totalCourses: 0,
        remainingCourses: 0,
      },
      teetimes: [],
    });
  }
}
