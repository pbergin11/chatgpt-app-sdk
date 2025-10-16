/**
 * Mock Golf Course Data
 * 
 * This file contains comprehensive mock data for golf courses including:
 * - Course details (name, location, type, holes, par, etc.)
 * - Amenities (spa, putting green, club rentals, restaurant, etc.)
 * - Pricing information
 * - Availability schedules
 * - Contact information
 * 
 * Used by: search_courses_by_area, get_course_details
 */

export interface TeeTime {
  time: string; // HH:mm format
  available: boolean;
  price: number; // USD
  players_available: number; // Max players for this slot
}

export interface DailyAvailability {
  date: string; // YYYY-MM-DD
  tee_times: TeeTime[];
}

export interface PricingTier {
  name: string; // "weekday", "weekend", "twilight", "senior"
  base_price: number;
  description: string;
}

export interface GolfCourse {
  id: string;
  name: string;
  city: string;
  state?: string; // For USA courses
  country?: string; // For international courses
  address: string;
  zipCode: string;
  lon: number;
  lat: number;
  
  // Course details
  type: "public" | "private" | "semi-private" | "resort";
  holes: 18 | 9 | 27 | 36;
  par: number;
  yardage: number;
  rating: number; // Course rating
  slope: number; // Slope rating
  designer: string;
  year_built: number;
  
  // Amenities (for filtering)
  amenities: {
    spa: boolean;
    putting_green: boolean;
    driving_range: boolean;
    club_rentals: boolean;
    cart_rentals: boolean;
    restaurant: boolean;
    bar: boolean;
    pro_shop: boolean;
    locker_rooms: boolean;
    practice_bunker: boolean;
    chipping_green: boolean;
    golf_lessons: boolean;
    club_fitting: boolean;
    event_space: boolean;
    lodging: boolean;
  };
  
  // Pricing
  pricing_tiers: PricingTier[];
  average_price: number; // For sorting by price
  
  // Availability (mock 7 days ahead)
  availability: DailyAvailability[];
  
  // Contact
  phone: string;
  email: string;
  website: string;
  
  // Additional info
  description: string;
  image_url: string;
  rating_stars: number; // 1-5 stars
  reviews_count: number;
}

// Helper function to generate tee times for a day
function generateTeeTimes(date: string, basePrice: number, availabilityLevel: "high" | "medium" | "low"): TeeTime[] {
  const times: TeeTime[] = [];
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Generate times from 6:00 AM to 6:00 PM (every 10 minutes)
  for (let hour = 6; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Twilight pricing after 3 PM
      const isTwilight = hour >= 15;
      let price = isWeekend ? basePrice * 1.3 : basePrice;
      if (isTwilight) price *= 0.7;
      
      // Determine availability based on level
      let available = true;
      if (availabilityLevel === "low") {
        available = Math.random() > 0.7; // 30% available
      } else if (availabilityLevel === "medium") {
        available = Math.random() > 0.4; // 60% available
      } else {
        available = Math.random() > 0.1; // 90% available
      }
      
      times.push({
        time: timeStr,
        available,
        price: Math.round(price),
        players_available: available ? Math.floor(Math.random() * 3) + 2 : 0, // 2-4 players
      });
    }
  }
  
  return times;
}

// Helper to generate 7 days of availability
function generateAvailability(basePrice: number, availabilityLevel: "high" | "medium" | "low"): DailyAvailability[] {
  const availability: DailyAvailability[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    availability.push({
      date: dateStr,
      tee_times: generateTeeTimes(dateStr, basePrice, availabilityLevel),
    });
  }
  
  return availability;
}

// Mock data for golf courses across different locations
export const MOCK_GOLF_COURSES: GolfCourse[] = [
  // San Diego, CA courses
  {
    id: "torrey-pines-south",
    name: "Torrey Pines Golf Course - South",
    city: "La Jolla",
    state: "CA",
    country: "USA",
    address: "11480 N Torrey Pines Rd",
    zipCode: "92037",
    lon: -117.2517,
    lat: 32.8987,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 7698,
    rating: 77.7,
    slope: 142,
    designer: "William P. Bell, Rees Jones",
    year_built: 1957,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: true,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 252, description: "Monday-Thursday" },
      { name: "weekend", base_price: 315, description: "Friday-Sunday" },
      { name: "twilight", base_price: 176, description: "After 3 PM" },
    ],
    average_price: 252,
    availability: generateAvailability(252, "low"),
    phone: "+1 (858) 452-3226",
    email: "info@torreypinesgolfcourse.com",
    website: "https://www.sandiego.gov/park-and-recreation/golf/torreypines",
    description: "Host of the 2021 U.S. Open, Torrey Pines South Course offers breathtaking Pacific Ocean views and championship-level play.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/torrey-pines.jpg",
    rating_stars: 4.8,
    reviews_count: 3421,
  },
  {
    id: "balboa-park",
    name: "Balboa Park Golf Course",
    city: "San Diego",
    state: "CA",
    country: "USA",
    address: "2600 Golf Course Dr",
    zipCode: "92102",
    lon: -117.1461,
    lat: 32.7338,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 6339,
    rating: 69.8,
    slope: 117,
    designer: "William P. Bell",
    year_built: 1915,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: false,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: false,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: false,
      event_space: false,
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 58, description: "Monday-Thursday" },
      { name: "weekend", base_price: 73, description: "Friday-Sunday" },
      { name: "twilight", base_price: 41, description: "After 3 PM" },
      { name: "senior", base_price: 46, description: "62+ weekdays" },
    ],
    average_price: 58,
    availability: generateAvailability(58, "high"),
    phone: "+1 (619) 235-1184",
    email: "info@balboaparkgolf.com",
    website: "https://www.sandiego.gov/park-and-recreation/golf/balboapark",
    description: "Historic course in the heart of San Diego, offering affordable golf with mature trees and challenging layout.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/balboa-park.jpg",
    rating_stars: 4.2,
    reviews_count: 1876,
  },
  {
    id: "coronado-golf",
    name: "Coronado Golf Course",
    city: "Coronado",
    state: "CA",
    country: "USA",
    address: "2000 Visalia Row",
    zipCode: "92118",
    lon: -117.1783,
    lat: 32.6859,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 6632,
    rating: 71.3,
    slope: 123,
    designer: "Jack Daray Sr.",
    year_built: 1957,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: false,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 65, description: "Monday-Thursday" },
      { name: "weekend", base_price: 80, description: "Friday-Sunday" },
      { name: "twilight", base_price: 46, description: "After 2 PM" },
    ],
    average_price: 65,
    availability: generateAvailability(65, "medium"),
    phone: "+1 (619) 435-3121",
    email: "info@coronadogolf.com",
    website: "https://www.golfcoronado.com",
    description: "Scenic bayside course with views of downtown San Diego and the Coronado Bridge.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/coronado.jpg",
    rating_stars: 4.3,
    reviews_count: 982,
  },
  {
    id: "aviara-golf",
    name: "Aviara Golf Club",
    city: "Carlsbad",
    state: "CA",
    country: "USA",
    address: "7447 Batiquitos Dr",
    zipCode: "92011",
    lon: -117.2839,
    lat: 33.1092,
    type: "resort",
    holes: 18,
    par: 72,
    yardage: 7007,
    rating: 74.3,
    slope: 138,
    designer: "Arnold Palmer",
    year_built: 1991,
    amenities: {
      spa: true,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: true,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 295, description: "Monday-Thursday" },
      { name: "weekend", base_price: 325, description: "Friday-Sunday" },
      { name: "twilight", base_price: 195, description: "After 2 PM" },
    ],
    average_price: 295,
    availability: generateAvailability(295, "medium"),
    phone: "+1 (760) 603-6900",
    email: "golf@aviaragolf.com",
    website: "https://www.aviaragolf.com",
    description: "Arnold Palmer signature design featuring rolling hills, flowering trees, and pristine conditions at the Park Hyatt Aviara Resort.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/aviara.jpg",
    rating_stars: 4.9,
    reviews_count: 2341,
  },
  {
    id: "maderas-golf",
    name: "Maderas Golf Club",
    city: "Poway",
    state: "CA",
    country: "USA",
    address: "17750 Old Coach Rd",
    zipCode: "92064",
    lon: -117.0364,
    lat: 32.9628,
    type: "semi-private",
    holes: 18,
    par: 72,
    yardage: 7014,
    rating: 74.1,
    slope: 141,
    designer: "Johnny Miller, Robert Muir Graves",
    year_built: 1999,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 175, description: "Monday-Thursday" },
      { name: "weekend", base_price: 225, description: "Friday-Sunday" },
      { name: "twilight", base_price: 125, description: "After 2 PM" },
    ],
    average_price: 175,
    availability: generateAvailability(175, "medium"),
    phone: "+1 (858) 451-8100",
    email: "info@maderasgolf.com",
    website: "https://www.maderasgolf.com",
    description: "Dramatic elevation changes and canyon views make this Johnny Miller design a memorable experience.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/maderas.jpg",
    rating_stars: 4.7,
    reviews_count: 1654,
  },

  // Phoenix, AZ courses
  {
    id: "troon-north-monument",
    name: "Troon North Golf Club - Monument Course",
    city: "Scottsdale",
    state: "AZ",
    country: "USA",
    address: "10320 E Dynamite Blvd",
    zipCode: "85262",
    lon: -111.8910,
    lat: 33.7003,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 7028,
    rating: 73.3,
    slope: 147,
    designer: "Tom Weiskopf, Jay Morrish",
    year_built: 1990,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "peak_season", base_price: 325, description: "Jan-Apr" },
      { name: "shoulder", base_price: 195, description: "May, Nov-Dec" },
      { name: "summer", base_price: 89, description: "Jun-Oct" },
    ],
    average_price: 203,
    availability: generateAvailability(203, "low"),
    phone: "+1 (480) 585-7700",
    email: "info@troonnorthgolf.com",
    website: "https://www.troonnorthgolf.com",
    description: "Consistently ranked among America's top public courses, featuring dramatic desert landscape and boulder-strewn fairways.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/troon-north.jpg",
    rating_stars: 4.9,
    reviews_count: 4231,
  },
  {
    id: "grayhawk-talon",
    name: "Grayhawk Golf Club - Talon Course",
    city: "Scottsdale",
    state: "AZ",
    country: "USA",
    address: "8620 E Thompson Peak Pkwy",
    zipCode: "85255",
    lon: -111.8645,
    lat: 33.6589,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 6973,
    rating: 73.5,
    slope: 139,
    designer: "David Graham, Gary Panks",
    year_built: 1994,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "peak_season", base_price: 289, description: "Jan-Apr" },
      { name: "shoulder", base_price: 169, description: "May, Nov-Dec" },
      { name: "summer", base_price: 79, description: "Jun-Oct" },
    ],
    average_price: 179,
    availability: generateAvailability(179, "medium"),
    phone: "+1 (480) 502-1800",
    email: "info@grayhawkgolf.com",
    website: "https://www.grayhawkgolf.com",
    description: "Championship desert golf with stunning mountain views and challenging play.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/grayhawk.jpg",
    rating_stars: 4.6,
    reviews_count: 2987,
  },

  // Miami, FL courses
  {
    id: "crandon-golf",
    name: "Crandon Golf at Key Biscayne",
    city: "Key Biscayne",
    state: "FL",
    country: "USA",
    address: "6700 Crandon Blvd",
    zipCode: "33149",
    lon: -80.1581,
    lat: 25.7043,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 7301,
    rating: 75.5,
    slope: 139,
    designer: "Robert von Hagge, Bruce Devlin",
    year_built: 1972,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: false,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 195, description: "Monday-Thursday" },
      { name: "weekend", base_price: 250, description: "Friday-Sunday" },
      { name: "twilight", base_price: 125, description: "After 2 PM" },
    ],
    average_price: 195,
    availability: generateAvailability(195, "high"),
    phone: "+1 (305) 361-9129",
    email: "info@crandongolf.com",
    website: "https://www.crandongolf.com",
    description: "Former home of the PGA Tour's Sony Open, featuring oceanside holes and tropical beauty.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/crandon.jpg",
    rating_stars: 4.7,
    reviews_count: 1923,
  },

  // London, UK courses
  {
    id: "wentworth-west",
    name: "Wentworth Club - West Course",
    city: "Virginia Water",
    country: "United Kingdom",
    address: "Wentworth Dr, Virginia Water",
    zipCode: "GU25 4LS",
    lon: -0.5897,
    lat: 51.4089,
    type: "private",
    holes: 18,
    par: 72,
    yardage: 7308,
    rating: 76.2,
    slope: 145,
    designer: "Harry Colt, Ernie Els",
    year_built: 1926,
    amenities: {
      spa: true,
      putting_green: true,
      driving_range: true,
      club_rentals: false,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: true,
    },
    pricing_tiers: [
      { name: "member_guest", base_price: 350, description: "Members only" },
    ],
    average_price: 350,
    availability: generateAvailability(350, "low"),
    phone: "+44 1344 842201",
    email: "info@wentworthclub.com",
    website: "https://www.wentworthclub.com",
    description: "Legendary championship venue hosting the BMW PGA Championship, featuring tree-lined fairways through Surrey heathland.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/wentworth.jpg",
    rating_stars: 5.0,
    reviews_count: 876,
  },

  // Sydney, Australia courses
  {
    id: "new-south-wales-golf",
    name: "New South Wales Golf Club",
    city: "La Perouse",
    state: "NSW",
    country: "Australia",
    address: "Henry Head, La Perouse",
    zipCode: "2036",
    lon: 151.2308,
    lat: -33.9897,
    type: "private",
    holes: 18,
    par: 72,
    yardage: 6820,
    rating: 74.8,
    slope: 141,
    designer: "Alister MacKenzie",
    year_built: 1928,
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: false,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: true,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: true,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "member_guest", base_price: 450, description: "Members only" },
    ],
    average_price: 450,
    availability: generateAvailability(450, "low"),
    phone: "+61 2 9661 4455",
    email: "info@nswgolfclub.com.au",
    website: "https://www.nswgolfclub.com.au",
    description: "Spectacular clifftop course overlooking Botany Bay, designed by legendary architect Alister MacKenzie.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/nsw-golf.jpg",
    rating_stars: 4.9,
    reviews_count: 543,
  },
];

// Helper function to search courses by area
export function searchCoursesByArea(
  city: string,
  state?: string,
  country?: string,
  radius?: number,
  filters?: Record<string, any>
): GolfCourse[] {
  let results = MOCK_GOLF_COURSES.filter((course) => {
    // Match city (case-insensitive)
    const cityMatch = course.city.toLowerCase() === city.toLowerCase();
    
    // Match state or country
    let locationMatch = cityMatch;
    if (state && course.state) {
      locationMatch = locationMatch && course.state.toLowerCase() === state.toLowerCase();
    }
    if (country && course.country) {
      locationMatch = locationMatch && course.country.toLowerCase() === country.toLowerCase();
    }
    
    return locationMatch;
  });

  // Apply filters if provided
  if (filters) {
    results = results.filter((course) => {
      // Filter by type
      if (filters.type && course.type !== filters.type) return false;
      
      // Filter by amenities
      if (filters.spa && !course.amenities.spa) return false;
      if (filters.putting_green && !course.amenities.putting_green) return false;
      if (filters.driving_range && !course.amenities.driving_range) return false;
      if (filters.club_rentals && !course.amenities.club_rentals) return false;
      if (filters.restaurant && !course.amenities.restaurant) return false;
      if (filters.golf_lessons && !course.amenities.golf_lessons) return false;
      if (filters.lodging && !course.amenities.lodging) return false;
      
      // Filter by price range
      if (filters.max_price && course.average_price > filters.max_price) return false;
      if (filters.min_price && course.average_price < filters.min_price) return false;
      
      // Filter by rating
      if (filters.min_rating && course.rating_stars < filters.min_rating) return false;
      
      return true;
    });
  }

  // Sort results
  if (filters?.sort_by) {
    switch (filters.sort_by) {
      case "cheapest":
        results.sort((a, b) => a.average_price - b.average_price);
        break;
      case "most_expensive":
        results.sort((a, b) => b.average_price - a.average_price);
        break;
      case "most_available":
        results.sort((a, b) => {
          const aAvailable = a.availability.reduce((sum, day) => 
            sum + day.tee_times.filter(t => t.available).length, 0);
          const bAvailable = b.availability.reduce((sum, day) => 
            sum + day.tee_times.filter(t => t.available).length, 0);
          return bAvailable - aAvailable;
        });
        break;
      case "highest_rated":
        results.sort((a, b) => b.rating_stars - a.rating_stars);
        break;
    }
  }

  return results;
}

// Helper function to find a course by ID or name+location
export function findCourse(
  courseId?: string,
  name?: string,
  state?: string,
  country?: string
): GolfCourse | null {
  if (courseId) {
    return MOCK_GOLF_COURSES.find((c) => c.id === courseId) || null;
  }
  
  if (name) {
    return MOCK_GOLF_COURSES.find((c) => {
      const nameMatch = c.name.toLowerCase().includes(name.toLowerCase());
      if (!nameMatch) return false;
      
      if (state && c.state) {
        return c.state.toLowerCase() === state.toLowerCase();
      }
      if (country && c.country) {
        return c.country.toLowerCase() === country.toLowerCase();
      }
      
      return true;
    }) || null;
  }
  
  return null;
}
