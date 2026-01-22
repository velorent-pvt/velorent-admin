import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_DOCUMENTS = ["AADHAAR", "PAN", "DRIVING_LICENSE"];

Deno.serve(async (req) => {
  try {
    const { document_requested } = await req.json();

    if (!Array.isArray(document_requested) || document_requested.length === 0) {
      return new Response(
        JSON.stringify({ error: "document_requested is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const filteredDocuments = document_requested.filter((doc: string) =>
      ALLOWED_DOCUMENTS.includes(doc)
    );

    if (filteredDocuments.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid document types" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const verification_id = `dgl_${crypto.randomUUID()}`;

    const response = await fetch(
      "https://sandbox.cashfree.com/vrs/v2/digilocker",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": Deno.env.get("CASHFREE_CLIENT_ID")!,
          "x-client-secret": Deno.env.get("CASHFREE_CLIENT_SECRET")!,
        },
        body: JSON.stringify({
          verification_id,
          document_requested: filteredDocuments,
          redirect_url: "https://verification.cashfree.com/dgl/status",
          user_flow: "signup",
        }),
      }
    );

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("DigiLocker error:", error);

    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
