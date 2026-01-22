import { redirect } from "react-router";
import { createClient } from "~/lib/supabase.server";
import type { Route } from "../+types";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();

  const supabase = await createClient(request, { headers } as Response);

  await supabase.auth.signOut();

  return redirect("/login", {
    headers,
  });
}

export default function Logout() {
  return null;
}
