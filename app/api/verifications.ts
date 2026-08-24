import { supabase } from "~/lib/supabase";

export type ManualVerification = {
  id: string;
  profile_id: string;
  document_type: "aadhaar" | "dl";
  front_image_url: string;
  back_image_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
};

export async function getPendingVerifications(): Promise<ManualVerification[]> {
  const { data, error } = await supabase
    .from("manual_verifications")
    .select(
      `
      id,
      profile_id,
      document_type,
      front_image_url,
      back_image_url,
      status,
      created_at,
      profile:profiles!profile_id (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const requests = (data ?? []) as unknown as ManualVerification[];
  const profileIds = [...new Set(requests.map((request) => request.profile_id))];
  if (profileIds.length === 0) return [];

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, aadhaar_number, dl_number")
    .in("id", profileIds);

  if (customersError) throw new Error(customersError.message);

  const documentsByProfile = new Map(
    ((customers as any[]) ?? []).map((customer) => [String(customer.id), customer]),
  );

  // A stale pending request must not be sent to review again after the same
  // document has already been verified on the customer record.
  return requests.filter((request) => {
    const customer = documentsByProfile.get(request.profile_id);
    return request.document_type === "aadhaar"
      ? !customer?.aadhaar_number
      : !customer?.dl_number;
  });
}

export type ApproveAadhaarInput = {
  verificationId: string;
  profileId: string;
  aadhaarNumber: string;
  aadhaarName: string;
  aadhaarAddress: string;
};

export type ApproveDLInput = {
  verificationId: string;
  profileId: string;
  dlNumber: string;
  dlName: string;
  dlAddress?: string;
};

/**
 * Approve an Aadhaar verification:
 * 1. Mark `manual_verifications` as approved
 * 2. Upsert the customer's aadhaar fields in `customers`
 * 3. Set `aadhaar_verified = true` in `profiles`
 */
export async function approveAadhaarVerification({
  verificationId,
  profileId,
  aadhaarNumber,
  aadhaarName,
  aadhaarAddress,
}: ApproveAadhaarInput): Promise<void> {
  // 1. Update manual_verifications status
  const { error: mvError } = await supabase
    .from("manual_verifications")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", verificationId);
  if (mvError) throw new Error(mvError.message);

  // 2. Upsert customer aadhaar fields
  const { error: custError } = await supabase
    .from("customers")
    .upsert(
      {
        id: profileId,
        aadhaar_number: aadhaarNumber.replace(/\s+/g, ""),
        aadhaar_name: aadhaarName,
        aadhaar_address: aadhaarAddress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (custError) throw new Error(custError.message);
}

/**
 * Approve a Driving License verification:
 * 1. Mark `manual_verifications` as approved
 * 2. Upsert the customer's DL fields in `customers`
 * 3. Set `dl_verified = true` in `profiles`
 */
export async function approveDLVerification({
  verificationId,
  profileId,
  dlNumber,
  dlName,
  dlAddress,
}: ApproveDLInput): Promise<void> {
  // 1. Update manual_verifications status
  const { error: mvError } = await supabase
    .from("manual_verifications")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", verificationId);
  if (mvError) throw new Error(mvError.message);

  // 2. Upsert customer DL fields
  const { error: custError } = await supabase
    .from("customers")
    .upsert(
      {
        id: profileId,
        dl_number: dlNumber.replace(/\s+/g, ""),
        dl_name: dlName,
        ...(dlAddress ? { dl_address: dlAddress } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (custError) throw new Error(custError.message);
}

/**
 * Reject a verification request (marks it as rejected, no customer data changes).
 */
export async function rejectVerification(verificationId: string): Promise<void> {
  const { error } = await supabase
    .from("manual_verifications")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", verificationId);
  if (error) throw new Error(error.message);
}
