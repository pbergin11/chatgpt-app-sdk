import type { CourseWithAvailability } from './types';

// Color spectrum: Green (high availability) → Yellow → Red (low availability)
export const COLOR_SPECTRUM = [
  '#69B34C', // Green - Very available
  '#ACB334', // Yellow-green - Good availability
  '#FAB733', // Yellow - Medium availability
  '#FF8E15', // Orange - Low availability
  '#FF4E11', // Red-orange - Very low availability
  '#FF0D0D', // Red - Not available
];

export const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

export const hexToRgb = (h: string) => ({ 
  r: parseInt(h.slice(1, 3), 16), 
  g: parseInt(h.slice(3, 5), 16), 
  b: parseInt(h.slice(5, 7), 16) 
});

export const rgbToHex = (r: number, g: number, b: number) => 
  `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;

export const getMarkerColor = (c: CourseWithAvailability | { id: string; provider?: string | null; provider_id?: string | null }) => {
  // If no provider, return black
  if (!c?.provider || !c?.provider_id) {
    return '#000000';
  }
  
  // For courses with provider, use random color allocation
  // Create a deterministic "random" color based on course ID
  const hash = c.id.split('').reduce((acc: number, char: string) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Use hash to pick a color from the spectrum
  const colorIndex = Math.abs(hash) % COLOR_SPECTRUM.length;
  return COLOR_SPECTRUM[colorIndex];
};

export const hasBookingProvider = (provider?: string | null) => {
  return provider === 'teebox' || provider === 'teefox';
};
