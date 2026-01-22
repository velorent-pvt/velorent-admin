import { createServerClient } from "@supabase/ssr";

export async function createClient(request: Request, response: Response) {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_API_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("Cookie");
          if (!cookieHeader) return [];
          return cookieHeader.split(";").map((cookie) => {
            const [name, value] = cookie.trim().split("=");
            return { name, value };
          });
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.headers.append("Set-Cookie", `${name}=${value}`),
            );
          } catch {}
        },
      },
    },
  );
}
