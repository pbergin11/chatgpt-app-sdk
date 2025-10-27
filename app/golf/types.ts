// Types for tool outputs we expect
export type CoursePoint = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lon: number;
  lat: number;
  type?: "public" | "private" | "semi-private" | "resort";
  verified?: boolean;
  distance?: number;
  website?: string | null;
  provider?: string | null;
  provider_id?: string | null;
  availability?: Array<{
    date: string;
    tee_times: Array<{
      time: string;
      available: boolean;
      price: number;
      players_available: number;
    }>;
  }>;
  matched_date?: string;
  available_on_date?: boolean;
};

export type CourseWithAvailability = CoursePoint & {
  totalAvailable: number;
  hasAvailability: boolean;
  onDateAvailableSlots?: number;
  availabilityScore: number;
};

export type GolfWidgetState = {
  __v: 1;
  viewport: { center: [number, number]; zoom: number };
  selectedCourseId?: string;
};

export type TeeTimeFilters = {
  patrons: number;
  holes: number;
  minPrice: number;
  maxPrice: number;
};

export type WaitlistData = {
  name: string;
  email: string;
  phone: string;
  timeStart: string;
  timeEnd: string;
};
