/**
 * Hook for fetching TeeBox tee times
 */

import { useState, useCallback } from 'react';
import type { TeeFoxResponse } from '../api/teefox/route';

export function useTeeTimes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeeFoxResponse | null>(null);

  const fetchTeeTimes = useCallback(async (
    locationId: string, 
    date: string,
    options?: {
      patrons?: number;
      holes?: number;
    }
  ) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({
        location_id: locationId,
        date: date,
      });
      
      // Add optional filters
      if (options?.patrons) {
        params.append('patrons', `[${options.patrons}]`);
      }
      if (options?.holes) {
        params.append('holes', `[${options.holes}]`);
      }
      
      const response = await fetch(`/api/teefox?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || 'Failed to fetch tee times');
      }

      const result: TeeFoxResponse = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useTeeTimes] Error fetching tee times:', {
        locationId,
        date,
        options,
        error: err,
      });
      
      // Return empty result instead of null to prevent UI breaking
      const emptyResult: TeeFoxResponse = {
        meta: {
          totalTeetimes: 0,
          nextPageToken: null,
          coursesSearched: 0,
          totalCourses: 0,
          remainingCourses: 0,
        },
        teetimes: [],
      };
      setData(emptyResult);
      return emptyResult;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    fetchTeeTimes,
    reset,
  };
}
