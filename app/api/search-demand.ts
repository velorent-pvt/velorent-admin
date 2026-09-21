export type SearchLocationCustomer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_id: number | null;
  created_at: string;
  aadhaar_name: string | null;
  aadhaar_number: string | null;
  dl_name: string | null;
  dl_number: string | null;
  search_count: number;
  no_result_count: number;
  last_searched_at: string;
};

export type SearchLocationDetail = {
  available_vehicles: number;
  daily: Array<{ date: string; searches: number; no_result_searches: number }>;
  customers: SearchLocationCustomer[];
};

export async function getSearchLocationDetail(location: string, start: string, end: string) {
  const params = new URLSearchParams({ location, start, end });
  const response = await fetch(`/api/search-location-detail?${params}`);
  const result = (await response.json()) as { detail?: SearchLocationDetail; error?: string };
  if (!response.ok || !result.detail) throw new Error(result.error ?? "Unable to load location detail.");
  return result.detail;
}
