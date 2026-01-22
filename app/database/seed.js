const features = [
  "Airbags",
  "ABS",
  "Rear Parking Sensors",

  "Air Conditioning",
  "Power Steering",
  "Power Windows",
  "Keyless Entry",

  "Bluetooth",
  "USB Charging",

  "Adjustable Seats",
  "Foldable Rear Seats",

  "Fog Lamps",
  "Manual Transmission",
  "Automatic Transmission",

  "GPS Navigation",
  "Spare Wheel",
];

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_API_KEY,
);

async function seed() {
  const { error } = await supabase
    .from("car_features")
    .insert(features.map((name) => ({ name })));

  if (error) {
    console.error(error);
  }
}

seed();
