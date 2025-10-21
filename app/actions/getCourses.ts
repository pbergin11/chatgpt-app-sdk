/**
 * Server Actions for Golf Course Data
 * 
 * These run on the server and can safely use the service role key.
 */

'use server';

import { searchCoursesByArea } from '@/lib/golfData';

export async function getCoursesNearSanDiego() {
  try {
    const courses = await searchCoursesByArea('San Diego', 'CA', undefined, 50);
    
    // Transform to a simpler format for client
    return courses.map(course => ({
      id: course.id,
      name: course.name,
      city: course.city,
      state: course.state,
      country: course.country,
      lon: course.lon,
      lat: course.lat,
      type: course.type,
      verified: course.verified,
    }));
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return [];
  }
}
