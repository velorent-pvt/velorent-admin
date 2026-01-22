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

  host: {
    id: string;
    profile: {
      full_name: string;
    };
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
};
