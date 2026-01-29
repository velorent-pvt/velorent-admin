import type { Host } from "~/features/host/columns";
import { supabase } from "~/lib/supabase";

export async function getPendingCars() {
  const { data, error } = await supabase
    .from("cars")
    .select(
      `
        id,
        registration_number,
        host:profiles!host_id (
            id,
            full_name
        ),
        
        model:car_models!model_id (
            id,
            name
        ),

        image:car_images!car_id (
            id,
            image_url,
            is_primary
        ),

        location:car_pickup_addresses!car_id (
            id,
            city,
            pincode
        )
    `,
    )
    .eq("is_verified", false)
    .eq("image.is_primary", true);

  if (error) {
    console.log(error);
    throw error;
  }

  return data;
}

export async function getApprovedCars() {
  const { data, error } = await supabase
    .from("cars")
    .select(
      `
        id,
        registration_number,
        host:profiles!host_id (
            id,
            full_name
        ),
        
        model:car_models!model_id (
            id,
            name
        ),

        image:car_images!car_id (
            id,
            image_url,
            is_primary
        ),

        location:car_pickup_addresses!car_id (
            id,
            city,
            pincode
        )
    `,
    )
    .eq("is_verified", true)
    .eq("image.is_primary", true);

  if (error) {
    console.log(error);
    throw error;
  }

  return data;
}

type Brand = {
  id: string;
  name: string;
};

type Model = {
  id: string;
  name: string;
};

type Detail = {
  host_id: string;
  brand_id: string;
  model_id: string;
  registration_number: string;
  manufacturing_year?: number | null;
  fuel_type: string;
  vehicle_seat_capacity: number;
  owner: string;
  body_type: string;
  rc_valid_till: string;
  insurance_valid_till: string;
  deposit_amount: number;
  commission_percentage: number;
  delivery_rate: number;
  hourly_price: number;
  delivery_enabled: boolean;
};

type Address = {
  car_id: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  delivery_enabled: boolean;
};

type Feature = {
  feature: {
    id: string;
    name: string;
  };
};

type Image = {
  car_id: string;
  image_url: string;
  is_primary?: boolean;
};

type Document = {
  car_id: string;
  document_url: string;
  document_type: "rc_book" | "owner_aadhaar" | "sign";
};

type Payload = {
  car: Detail;
  address: Address;
  features: Feature[];
  images: Image[];
  documents: Document[];
  host: Host;
};

export async function getCarById(car_id: string): Promise<
  Payload & {
    brand: Brand;
    model: Model;
  }
> {
  const { data, error } = await supabase
    .from("cars")
    .select(
      `
      id,
      host_id,
      brand_id,
      model_id,
      registration_number,
      manufacturing_year,
      fuel_type,
      vehicle_seat_capacity,
      owner,
      body_type,
      deposit_amount,
      commission_percentage,
      delivery_rate,
      hourly_price,
      rc_valid_till,
      insurance_valid_till,
      delivery_enabled,

      brand:car_brands!brand_id (
        id,
        name
      ),

      model:car_models!model_id (
        id,
        name
      ),

      address:car_pickup_addresses!car_id (
        id,
        address_line1,
        city,
        state,
        pincode,
        latitude,
        longitude
      ),

      features:car_feature_mappings!car_id (
        feature:car_features!feature_id (
          id,
          name
        )
      ),

      host:profiles!host_id (
        *
      ),


      images:car_images!car_id (
        image_url,
        is_primary
      ),

      documents:car_documents!car_id (
        document_url,
        document_type
      )
    `,
    )
    .eq("id", car_id)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Car not found");

  return {
    car: {
      host_id: data.host_id,
      brand_id: data.brand_id,
      model_id: data.model_id,
      registration_number: data.registration_number,
      manufacturing_year: data.manufacturing_year,
      fuel_type: data.fuel_type,
      vehicle_seat_capacity: data.vehicle_seat_capacity,
      owner: data.owner,
      body_type: data.body_type,
      rc_valid_till: data.rc_valid_till,
      insurance_valid_till: data.insurance_valid_till,
    },

    brand: {
      id: data.brand.id,
      name: data.brand.name,
    },

    model: {
      id: data.model.id,
      name: data.model.name,
    },

    address: {
      car_id,
      address_line1: data.address?.address_line1 ?? "",
      city: data.address?.city ?? "",
      state: data.address?.state ?? "",
      pincode: data.address?.pincode ?? "",
      latitude: data.address?.latitude ?? null,
      longitude: data.address?.longitude ?? null,
      delivery_enabled: data.address.delivery_enabled,
    },

    features: data.features,

    images: data.images.map((img) => ({
      car_id,
      image_url: img.image_url,
      is_primary: img.is_primary ?? false,
    })),

    documents: data.documents.map((doc) => ({
      car_id,
      document_url: doc.document_url,
      document_type: doc.document_type,
    })),

    host: data.host,
  };
}

type HostAgreementPayload = {
  host_name: string;
  vehicle_number: string;
  host_sign: string;
};

type HostAgreementResponse = {
  success: boolean;
  message: string;
  pdf_url: string;
};

export async function generateHostAgreement(
  payload: HostAgreementPayload,
): Promise<HostAgreementResponse> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/pdf/host-agreement`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to generate host agreement");
    }

    return await response.json();
  } catch (error) {
    console.error("generateHostAgreement error:", error);
    throw error;
  }
}

type ApproveCarParams = {
  carId: string;
  hourly_price: number;
  commission_percentage: number;
  delivery_rate: number;
  deposit_amount: number;
};

export async function approveCar({
  carId,
  hourly_price,
  commission_percentage,
  delivery_rate,
  deposit_amount,
}: ApproveCarParams) {
  const { data, error } = await supabase
    .from("cars")
    .update({
      is_verified: true,
      hourly_price,
      commission_percentage,
      delivery_rate,
      deposit_amount,
    })
    .eq("id", carId)
    .select()
    .single();

  if (error) {
    console.error("Approve car failed:", error);
    throw error;
  }

  return data;
}

type VehicleApprovalEmailData = {
  hostName: string;
  vehicleName: string;
  registrationNumber: string;
  pdfUrl: string;
  companyName: string;
};

type NotifyApprovalPayload = {
  carId: string;
  userId: string;
  email: {
    to: string;
    template: "vehicle-verified";
    data: VehicleApprovalEmailData;
  };
};

function getTodayDate() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function notifyApproval(payload: NotifyApprovalPayload) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        carId: payload.carId,
        type: "Car Approved",
        title: "Your vehicle has been approved",
        message: "Your vehicle is now live on VeloRent",
        userId: payload.userId,
        email: {
          ...payload.email,
          data: {
            ...payload.email.data,
            approvalDate: getTodayDate(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to notify host about approval");
    }

    return await response.json();
  } catch (error) {
    console.error("notifyApproval error:", error);
    throw error;
  }
}
