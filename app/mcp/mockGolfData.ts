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
  local_rules?: string;
  practice?: {
    range_available: boolean;
    stalls?: number;
    surface?: "grass" | "mats" | "both";
    hours?: Record<string, string>;
  };
  
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
function generateTeeTimes(date: string, basePrice: number, availabilityLevel: "very-high" | "high" | "medium" | "low" | "very-low" | "none"): TeeTime[] {
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
      
      // Determine availability based on level - wider range for better color spectrum
      let available = true;
      if (availabilityLevel === "none") {
        available = Math.random() > 0.95; // 5% available
      } else if (availabilityLevel === "very-low") {
        available = Math.random() > 0.80; // 20% available
      } else if (availabilityLevel === "low") {
        available = Math.random() > 0.65; // 35% available
      } else if (availabilityLevel === "medium") {
        available = Math.random() > 0.45; // 55% available
      } else if (availabilityLevel === "high") {
        available = Math.random() > 0.25; // 75% available
      } else {
        available = Math.random() > 0.05; // 95% available (very-high)
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
function generateAvailability(basePrice: number, availabilityLevel: "very-high" | "high" | "medium" | "low" | "very-low" | "none"): DailyAvailability[] {
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
    availability: generateAvailability(252, "very-low"),
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
    availability: generateAvailability(58, "very-high"),
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
    availability: generateAvailability(65, "high"),
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
    availability: generateAvailability(295, "low"),
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
    availability: generateAvailability(203, "none"),
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
    availability: generateAvailability(179, "high"),
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
    availability: generateAvailability(195, "very-high"),
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
    availability: generateAvailability(350, "very-low"),
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
    availability: generateAvailability(450, "none"),
    phone: "+61 2 9661 4455",
    email: "info@nswgolfclub.com.au",
    website: "https://www.nswgolfclub.com.au",
    description: "Spectacular clifftop course overlooking Botany Bay, designed by legendary architect Alister MacKenzie.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/nsw-golf.jpg",
    rating_stars: 4.9,
    reviews_count: 543,
  },
  // Denver, CO courses
  {
    id: "city-park-denver",
    name: "City Park Golf Course",
    city: "Denver",
    state: "CO",
    country: "USA",
    address: "3181 E 23rd Ave",
    zipCode: "80205",
    lon: -104.9560,
    lat: 39.7507,
    type: "public",
    holes: 18,
    par: 70,
    yardage: 6630,
    rating: 70.5,
    slope: 122,
    designer: "City of Denver / redesign",
    year_built: 1913,
    local_rules: "Repair ball marks and divots; keep pace with group ahead.",
    practice: { range_available: true, stalls: 30, surface: "both", hours: { mon: "07:00-20:00", tue: "07:00-20:00", wed: "07:00-20:00", thu: "07:00-20:00", fri: "07:00-20:00", sat: "06:30-20:00", sun: "06:30-20:00" } },
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
      { name: "weekday", base_price: 58, description: "Monday-Thursday" },
      { name: "weekend", base_price: 75, description: "Friday-Sunday" },
      { name: "twilight", base_price: 40, description: "After 3 PM" },
    ],
    average_price: 58,
    availability: generateAvailability(58, "high"),
    phone: "+1 (720) 865-3410",
    email: "info@denvergolf.org",
    website: "https://www.denvergov.org/golf/city-park",
    description: "Renovated municipal course with downtown Denver skyline views.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/city-park-denver.jpg",
    rating_stars: 4.3,
    reviews_count: 1240,
  },
  {
    id: "willis-case-denver",
    name: "Willis Case Golf Course",
    city: "Denver",
    state: "CO",
    country: "USA",
    address: "4999 Vrain St",
    zipCode: "80212",
    lon: -105.0466,
    lat: 39.7878,
    type: "public",
    holes: 18,
    par: 71,
    yardage: 6450,
    rating: 70.1,
    slope: 127,
    designer: "City of Denver",
    year_built: 1928,
    local_rules: "Winter rules as posted; cart path only when wet.",
    practice: { range_available: true, stalls: 20, surface: "grass" },
    amenities: {
      spa: false,
      putting_green: true,
      driving_range: true,
      club_rentals: true,
      cart_rentals: true,
      restaurant: true,
      bar: true,
      pro_shop: true,
      locker_rooms: false,
      practice_bunker: true,
      chipping_green: true,
      golf_lessons: true,
      club_fitting: false,
      event_space: true,
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 52, description: "Monday-Thursday" },
      { name: "weekend", base_price: 68, description: "Friday-Sunday" },
      { name: "twilight", base_price: 38, description: "After 3 PM" },
    ],
    average_price: 52,
    availability: generateAvailability(52, "medium"),
    phone: "+1 (720) 913-0705",
    email: "info@denvergolf.org",
    website: "https://www.denvergov.org/golf/willis-case",
    description: "Tree-lined fairways in northwest Denver with mountain vistas.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/willis-case.jpg",
    rating_stars: 4.1,
    reviews_count: 860,
  },
  // Las Vegas, NV courses
  {
    id: "bali-hai-las-vegas",
    name: "Bali Hai Golf Club",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    address: "5160 Las Vegas Blvd S",
    zipCode: "89119",
    lon: -115.1710,
    lat: 36.0840,
    type: "resort",
    holes: 18,
    par: 71,
    yardage: 7002,
    rating: 73.0,
    slope: 130,
    designer: "Lee Schmidt, Brian Curley",
    year_built: 2000,
    local_rules: "Desert areas play as lateral hazards unless marked otherwise.",
    practice: { range_available: true, stalls: 40, surface: "mats" },
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
      lodging: false,
    },
    pricing_tiers: [
      { name: "weekday", base_price: 199, description: "Monday-Thursday" },
      { name: "weekend", base_price: 249, description: "Friday-Sunday" },
      { name: "twilight", base_price: 130, description: "After 2 PM" },
    ],
    average_price: 199,
    availability: generateAvailability(199, "medium"),
    phone: "+1 (888) 427-6678",
    email: "info@balihai-golfclub.com",
    website: "https://www.balihai-golfclub.com",
    description: "Tropical-themed championship course on the Las Vegas Strip.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/bali-hai.jpg",
    rating_stars: 4.4,
    reviews_count: 2100,
  },
  {
    id: "las-vegas-muni",
    name: "Las Vegas Golf Club",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    address: "4300 W Washington Ave",
    zipCode: "89107",
    lon: -115.1996,
    lat: 36.1805,
    type: "public",
    holes: 18,
    par: 72,
    yardage: 6319,
    rating: 69.8,
    slope: 115,
    designer: "William P. Bell",
    year_built: 1938,
    local_rules: "City rules apply; please repair ball marks and fill divots.",
    practice: { range_available: true, stalls: 25, surface: "mats" },
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
      { name: "weekday", base_price: 39, description: "Monday-Thursday" },
      { name: "weekend", base_price: 49, description: "Friday-Sunday" },
      { name: "twilight", base_price: 29, description: "After 3 PM" },
    ],
    average_price: 39,
    availability: generateAvailability(39, "high"),
    phone: "+1 (702) 646-3003",
    email: "info@lasvegasgolfclub.com",
    website: "https://www.lasvegasgolfclub.com",
    description: "Historic muni with walkable layout and affordable rates.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/lv-muni.jpg",
    rating_stars: 4.0,
    reviews_count: 980,
  },
  // Michigan courses
  {
    id: "oakland-hills-south",
    name: "Oakland Hills Country Club - South",
    city: "Bloomfield Hills",
    state: "MI",
    country: "USA",
    address: "3951 W Maple Rd",
    zipCode: "48301",
    lon: -83.2807,
    lat: 42.5459,
    type: "private",
    holes: 18,
    par: 72,
    yardage: 7444,
    rating: 76.6,
    slope: 146,
    designer: "Donald Ross",
    year_built: 1918,
    local_rules: "Members and guests only; adhere to posted pace of play.",
    practice: { range_available: true, stalls: 40, surface: "grass" },
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
      lodging: false,
    },
    pricing_tiers: [
      { name: "member_guest", base_price: 350, description: "Members only" },
    ],
    average_price: 350,
    availability: generateAvailability(350, "low"),
    phone: "+1 (248) 644-2500",
    email: "info@oaklandhillscc.com",
    website: "https://www.oaklandhillscc.com",
    description: "Major championship venue known as the Monster.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/oakland-hills.jpg",
    rating_stars: 5.0,
    reviews_count: 2100,
  },
  {
    id: "sweetgrass-mi",
    name: "Island Resort & Casino - Sweetgrass",
    city: "Harris",
    state: "MI",
    country: "USA",
    address: "W 399 US-2",
    zipCode: "49845",
    lon: -87.3070,
    lat: 45.7006,
    type: "resort",
    holes: 18,
    par: 72,
    yardage: 7305,
    rating: 74.6,
    slope: 138,
    designer: "Paul Albanese",
    year_built: 2008,
    local_rules: "Cart path only when posted; protect native areas.",
    practice: { range_available: true, stalls: 25, surface: "grass" },
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
      { name: "weekday", base_price: 110, description: "Monday-Thursday" },
      { name: "weekend", base_price: 145, description: "Friday-Sunday" },
      { name: "twilight", base_price: 85, description: "After 2 PM" },
    ],
    average_price: 110,
    availability: generateAvailability(110, "medium"),
    phone: "+1 (906) 723-2255",
    email: "golf@islandresortandcasino.com",
    website: "https://www.islandresortgolf.com",
    description: "Award-winning resort course with fescue-lined fairways and rolling terrain.",
    image_url: "https://i.postimg.cc/9FLqXqYZ/sweetgrass.jpg",
    rating_stars: 4.8,
    reviews_count: 980,
  },
];

// Helper function to search courses by area
export function searchCoursesByArea(
  city?: string,
  state?: string,
  country?: string,
  radius?: number,
  filters?: Record<string, any>
): GolfCourse[] {
  let results = MOCK_GOLF_COURSES.filter((course) => {
    // If only state provided (USA)
    if (!city && state && !country) {
      return course.state?.toLowerCase() === state.toLowerCase();
    }
    
    // If only country provided (international)
    if (!city && !state && country) {
      return course.country?.toLowerCase() === country.toLowerCase();
    }
    
    // If city provided, do flexible matching
    if (city) {
      const cityLower = city.toLowerCase();
      const courseCityLower = course.city.toLowerCase();
      
      // Exact match or partial match (e.g., "San Diego" matches "San Diego", "La Jolla" in San Diego area)
      const cityMatch = courseCityLower.includes(cityLower) || cityLower.includes(courseCityLower);
      
      if (!cityMatch) return false;
      
      // If state/country also provided, must match
      if (state && course.state) {
        return course.state.toLowerCase() === state.toLowerCase();
      }
      if (country && course.country) {
        return course.country.toLowerCase() === country.toLowerCase();
      }
      
      return true;
    }
    
    return false;
  });

  // Apply filters if provided
  if (filters) {
    results = results.filter((course) => {
      // Filter by type
      if (filters.type && course.type !== filters.type) return false;
      if (filters.types && Array.isArray(filters.types) && filters.types.length > 0 && !filters.types.includes(course.type)) return false;
      
      // Filter by amenities
      if (filters.spa && !course.amenities.spa) return false;
      if (filters.putting_green && !course.amenities.putting_green) return false;
      if (filters.driving_range && !course.amenities.driving_range) return false;
      if (filters.club_rentals && !course.amenities.club_rentals) return false;
      if (filters.restaurant && !course.amenities.restaurant) return false;
      if (filters.golf_lessons && !course.amenities.golf_lessons) return false;
      if (filters.lodging && !course.amenities.lodging) return false;
      if (filters.has_range && !(course.practice?.range_available || course.amenities.driving_range)) return false;
      if (filters.private_only && course.type !== "private") return false;
      if (filters.pro_shop && !course.amenities.pro_shop) return false;
      if (filters.bar && !course.amenities.bar) return false;
      if (filters.locker_rooms && !course.amenities.locker_rooms) return false;
      if (filters.event_space && !course.amenities.event_space) return false;
      if (filters.practice_bunker && !course.amenities.practice_bunker) return false;
      if (filters.chipping_green && !course.amenities.chipping_green) return false;
      if (filters.practice_range_surface) {
        const surf = course.practice?.surface;
        const req = filters.practice_range_surface;
        if (!surf) return false;
        if (!(surf === req || surf === "both")) return false;
      }
      
      // Filter by price range
      if (filters.max_price && course.average_price > filters.max_price) return false;
      if (filters.min_price && course.average_price < filters.min_price) return false;
      
      // Filter by rating
      if (filters.min_rating && course.rating_stars < filters.min_rating) return false;
      if (filters.course_rating_min && course.rating < filters.course_rating_min) return false;
      if (filters.course_rating_max && course.rating > filters.course_rating_max) return false;
      if (filters.min_reviews && course.reviews_count < filters.min_reviews) return false;

      // Free text and local rules contains
      if (filters.search_text) {
        const q = String(filters.search_text).toLowerCase();
        const hay = [course.name, course.description, course.city, course.designer]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase())
          .join(" ");
        if (!hay.includes(q)) return false;
      }
      if (filters.local_rules_contains) {
        const q = String(filters.local_rules_contains).toLowerCase();
        if (!course.local_rules || !course.local_rules.toLowerCase().includes(q)) return false;
      }

      // Course attributes
      if (filters.holes_in && Array.isArray(filters.holes_in) && filters.holes_in.length > 0 && !filters.holes_in.includes(course.holes)) return false;
      if (filters.par_min && course.par < filters.par_min) return false;
      if (filters.par_max && course.par > filters.par_max) return false;
      if (filters.yardage_min && course.yardage < filters.yardage_min) return false;
      if (filters.yardage_max && course.yardage > filters.yardage_max) return false;
      if (filters.slope_min && course.slope < filters.slope_min) return false;
      if (filters.slope_max && course.slope > filters.slope_max) return false;
      if (filters.designer && !course.designer.toLowerCase().includes(String(filters.designer).toLowerCase())) return false;
      if (filters.year_built_min && course.year_built < filters.year_built_min) return false;
      if (filters.year_built_max && course.year_built > filters.year_built_max) return false;

      // Filter by specific date availability
      if (filters.date) {
        const toMinutes = (hhmm: string) => {
          const [h, m] = hhmm.split(":").map((n: string) => parseInt(n, 10));
          return h * 60 + m;
        };
        const day = course.availability.find((d) => d.date === filters.date);
        const applyWindow = (time: string) => {
          if (!filters.start_time && !filters.end_time && !filters.time_window) return true;
          let start = 0;
          let end = 24 * 60 - 1;
          if (filters.time_window) {
            switch (filters.time_window) {
              case "morning": start = toMinutes("06:00"); end = toMinutes("10:59"); break;
              case "midday": start = toMinutes("11:00"); end = toMinutes("13:59"); break;
              case "afternoon": start = toMinutes("14:00"); end = toMinutes("15:59"); break;
              case "twilight": start = toMinutes("16:00"); end = toMinutes("18:59"); break;
            }
          }
          if (filters.start_time) start = Math.max(start, toMinutes(filters.start_time));
          if (filters.end_time) end = Math.min(end, toMinutes(filters.end_time));
          const t = toMinutes(time);
          return t >= start && t <= end;
        };
        const slots = (day?.tee_times ?? []).filter((t) => t.available && applyWindow(t.time));
        const slotsWithPlayers = typeof filters.players_min === "number" ? slots.filter(s => s.players_available >= filters.players_min) : slots;
        const slotsWithPriceMin = typeof filters.price_on_date_min === "number" ? slotsWithPlayers.filter(s => s.price >= filters.price_on_date_min) : slotsWithPlayers;
        const slotsWithPrice = typeof filters.price_on_date_max === "number" ? slotsWithPriceMin.filter(s => s.price <= filters.price_on_date_max) : slotsWithPriceMin;
        const availableSlots = slotsWithPrice.length;
        if (!filters.include_unavailable && availableSlots <= 0) return false;
        if ((typeof filters.price_on_date_min === "number" || typeof filters.price_on_date_max === "number" || typeof filters.players_min === "number" || filters.start_time || filters.end_time || filters.time_window) && availableSlots <= 0) return false;
      }
      
      return true;
    });
  }

  // Sort results
  if (filters?.sort_by) {
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map((n: string) => parseInt(n, 10));
      return h * 60 + m;
    };
    const matchedDate: string | undefined = filters?.date;
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
      case "cheapest_on_date": {
        if (matchedDate) {
          results.sort((a, b) => {
            const aDay = a.availability.find(d => d.date === matchedDate);
            const bDay = b.availability.find(d => d.date === matchedDate);
            const aMin = aDay ? Math.min(...aDay.tee_times.filter(t => t.available).map(t => t.price).concat([Infinity])) : Infinity;
            const bMin = bDay ? Math.min(...bDay.tee_times.filter(t => t.available).map(t => t.price).concat([Infinity])) : Infinity;
            return aMin - bMin;
          });
        }
        break;
      }
      case "earliest_available": {
        if (matchedDate) {
          results.sort((a, b) => {
            const aDay = a.availability.find(d => d.date === matchedDate);
            const bDay = b.availability.find(d => d.date === matchedDate);
            const aTimes = aDay ? aDay.tee_times.filter(t => t.available).map(t => toMinutes(t.time)) : [];
            const bTimes = bDay ? bDay.tee_times.filter(t => t.available).map(t => toMinutes(t.time)) : [];
            const aMin = aTimes.length ? Math.min(...aTimes) : Infinity;
            const bMin = bTimes.length ? Math.min(...bTimes) : Infinity;
            return aMin - bMin;
          });
        }
        break;
      }
      case "closest_to_time": {
        if (matchedDate && typeof filters.desired_time === "string") {
          const target = toMinutes(filters.desired_time);
          results.sort((a, b) => {
            const aDay = a.availability.find(d => d.date === matchedDate);
            const bDay = b.availability.find(d => d.date === matchedDate);
            const aDiffs = aDay ? aDay.tee_times.filter(t => t.available).map(t => Math.abs(toMinutes(t.time) - target)) : [Infinity];
            const bDiffs = bDay ? bDay.tee_times.filter(t => t.available).map(t => Math.abs(toMinutes(t.time) - target)) : [Infinity];
            const aMin = aDiffs.length ? Math.min(...aDiffs) : Infinity;
            const bMin = bDiffs.length ? Math.min(...bDiffs) : Infinity;
            return aMin - bMin;
          });
        }
        break;
      }
      case "longest":
        results.sort((a, b) => b.yardage - a.yardage);
        break;
      case "shortest":
        results.sort((a, b) => a.yardage - b.yardage);
        break;
      case "highest_slope":
        results.sort((a, b) => b.slope - a.slope);
        break;
      case "newest":
        results.sort((a, b) => b.year_built - a.year_built);
        break;
      case "oldest":
        results.sort((a, b) => a.year_built - b.year_built);
        break;
      case "best_value":
        results.sort((a, b) => (b.rating_stars / b.average_price) - (a.rating_stars / a.average_price));
        break;
    }
  }

  return results;
}

// Helper to get a readable location description
export function getLocationDescription(city?: string, state?: string, country?: string): string {
  if (city && state) return `${city}, ${state}`;
  if (city && country) return `${city}, ${country}`;
  if (state) return state;
  if (country) return country;
  if (city) return city;
  return "unknown location";
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
