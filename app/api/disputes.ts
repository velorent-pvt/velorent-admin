import { supabase } from "~/lib/supabase";

export type AdminDispute = {
  id: string;
  dispute_code: string;
  booking_id: string;
  booking_code: string;
  booking_status: string;
  raised_by: string;
  raised_by_name: string;
  customer_name: string;
  host_name: string;
  car_name: string;
  registration_number: string;
  dispute_type: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const DISPUTE_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

function firstName(source: any): string {
  if (Array.isArray(source)) return String(source[0]?.name ?? "");
  return String(source?.name ?? "");
}

function toObject(value: any) {
  if (Array.isArray(value)) return value[0] ?? {};
  return value ?? {};
}

function toCarName(car: any) {
  const normalizedCar = toObject(car);
  const brandName = firstName(normalizedCar.car_brands).trim();
  const modelName = firstName(normalizedCar.car_models).trim();
  const carName = `${brandName} ${modelName}`.trim();
  return carName || "Unknown Car";
}

async function getProfilesMap(profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, { full_name: string | null }>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (error) throw error;

  return new Map(
    ((data as any[]) ?? []).map((profile) => [
      String(profile.id),
      { full_name: profile.full_name ?? null },
    ]),
  );
}

function mapDisputeRow(row: any, profilesById: Map<string, { full_name: string | null }>): AdminDispute {
  const booking = toObject(row.booking);
  const car = toObject(booking.car);

  const customerId = String(booking.customer_id ?? "");
  const hostId = String(booking.host_id ?? "");
  const raisedById = String(row.raised_by ?? "");

  return {
    id: String(row.id),
    dispute_code: String(row.id).slice(-8).toUpperCase(),
    booking_id: String(row.booking_id),
    booking_code: String(row.booking_id).slice(-8).toUpperCase(),
    booking_status: String(booking.status ?? "unknown"),
    raised_by: raisedById,
    raised_by_name: profilesById.get(raisedById)?.full_name ?? "Unknown User",
    customer_name: profilesById.get(customerId)?.full_name ?? "Unknown Customer",
    host_name: profilesById.get(hostId)?.full_name ?? "Unknown Host",
    car_name: toCarName(car),
    registration_number: String(car.registration_number ?? "-"),
    dispute_type: String(row.dispute_type ?? "other"),
    description: String(row.description ?? ""),
    image_url: (row.image_url as string | null) ?? null,
    status: String(row.status ?? "open"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getAllDisputes(): Promise<AdminDispute[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      `
      id,
      booking_id,
      raised_by,
      dispute_type,
      description,
      image_url,
      status,
      created_at,
      updated_at,
      booking:bookings(
        id,
        status,
        customer_id,
        host_id,
        car:cars(
          registration_number,
          car_brands(name),
          car_models(name)
        )
      )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data as any[]) ?? [];

  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => {
          const booking = toObject(row.booking);
          return [row.raised_by, booking.customer_id, booking.host_id];
        })
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const profilesById = await getProfilesMap(profileIds);
  return rows.map((row) => mapDisputeRow(row, profilesById));
}

export async function getDisputeByIdAdmin(disputeId: string): Promise<AdminDispute> {
  const { data, error } = await supabase
    .from("disputes")
    .select(
      `
      id,
      booking_id,
      raised_by,
      dispute_type,
      description,
      image_url,
      status,
      created_at,
      updated_at,
      booking:bookings(
        id,
        status,
        customer_id,
        host_id,
        car:cars(
          registration_number,
          car_brands(name),
          car_models(name)
        )
      )
      `,
    )
    .eq("id", disputeId)
    .single();

  if (error) throw error;

  const booking = toObject((data as any).booking);
  const profileIds = [
    String((data as any).raised_by ?? ""),
    String(booking.customer_id ?? ""),
    String(booking.host_id ?? ""),
  ].filter((id) => id.length > 0);

  const profilesById = await getProfilesMap(profileIds);
  return mapDisputeRow(data, profilesById);
}

export async function updateDisputeStatusAdmin(disputeId: string, status: string) {
  if (!DISPUTE_STATUSES.includes(status as (typeof DISPUTE_STATUSES)[number])) {
    throw new Error("Invalid dispute status");
  }

  const { error } = await supabase
    .from("disputes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", disputeId);

  if (error) throw error;
}
