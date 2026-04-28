import { supabase } from "~/lib/supabase";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | "ongoing"
  | "completed";

export type AdminBooking = {
  id: string;
  car_id: string;
  customer_id: string;
  host_id: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  base_amount: number;
  delivery_amount: number;
  commission_percentage: number;
  commission_amount: number;
  deposit_amount: number;
  deposit_status: "pending" | "paid" | "refunded" | "forfeited";
  total_amount: number;
  pickup_type: "self_pickup" | "home_delivery";
  delivery_address?: string | null;
  handover_otp?: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  car?: {
    id: string;
    registration_number?: string;
    hourly_price?: number;
    car_brands?: { name: string };
    car_models?: { name: string };
    car_images?: { image_url: string; is_primary: boolean }[];
    host?: { full_name: string; phone?: string; email?: string };
    car_pickup_addresses?: { address_line1: string; city: string; state: string }[];
  };
  customer?: {
    id: string;
    full_name?: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
  };
  customer_details?: any;
  host_details?: any;
};

export async function getAllBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      car_id,
      customer_id,
      host_id,
      start_time,
      end_time,
      total_hours,
      base_amount,
      delivery_amount,
      commission_percentage,
      commission_amount,
      deposit_amount,
      deposit_status,
      total_amount,
      pickup_type,
      delivery_address,
      status,
      created_at,
      updated_at,
      car:cars(
        id,
        registration_number,
        hourly_price,
        car_brands(name),
        car_models(name),
        car_images(image_url, is_primary)
      ),
      customer:profiles!customer_id(id, full_name, phone, email, avatar_url)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminBooking[];
}

export async function getBookingById(id: string): Promise<AdminBooking> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      car_id,
      customer_id,
      host_id,
      start_time,
      end_time,
      total_hours,
      base_amount,
      delivery_amount,
      commission_percentage,
      commission_amount,
      deposit_amount,
      deposit_status,
      total_amount,
      pickup_type,
      delivery_address,
      handover_otp,
      status,
      created_at,
      updated_at,
      car:cars(
        id,
        registration_number,
        hourly_price,
        car_brands(name),
        car_models(name),
        car_images(image_url, is_primary),
        host:profiles!host_id(full_name, phone, email),
        car_pickup_addresses(address_line1, city, state)
      ),
      customer:profiles!customer_id(id, full_name, phone, email, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  
  const booking = data as unknown as AdminBooking;
  
  const [{ data: cData }, { data: hData }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", booking.customer_id).maybeSingle(),
    supabase.from("hosts").select("*").eq("id", booking.host_id).maybeSingle()
  ]);

  return { ...booking, customer_details: cData, host_details: hData };
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
