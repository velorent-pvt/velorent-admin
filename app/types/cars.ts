import type { Database } from "~/database/types";

export type Car = Database["public"]["Tables"]["cars"]["Row"];

export type CarWithDetails = {
  id: string;
  registration_number: string;
  manufacturing_year: number | null;
  fuel_type: string;
  transmission: string;
  hourly_price: number;
  deposit_amount: number;
  is_active: boolean;
  is_verified: boolean;
  delivery_enabled: boolean;
  created_at: string;

  car_brands: {
    id: string;
    name: string;
    image_url: string;
  };

  car_models: {
    id: string;
    name: string;
  };
};

export type PendingCar = {
  id: string;
  registration_number: string;
  created_at: string;

  host: {
    id: string;
    full_name: string;
  };

  brand: {
    id: string;
    name: string;
  };

  model: {
    id: string;
    name: string;
  };

  image: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];

  location: {
    id: string;
    city: string;
    pincode: string;
  };

  hourly_price: number;
  is_active: boolean;
  bookings: {
    start_time: string;
    end_time: string;
    status: string;
  }[];
  car_availability: {
    start_time: string;
    end_time: string;
    status: string;
  }[];
};
