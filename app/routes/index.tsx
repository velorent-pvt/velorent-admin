import { Plus } from "lucide-react";
import {
  Link,
  Outlet,
  redirect,
  useLocation,
  useNavigation,
  data,
  type LoaderFunctionArgs,
} from "react-router";

import { AppSidebar } from "~/components/shared/AppSidebar";
import DynamicBreadcrumb from "~/components/shared/DynamicBreadcrumb";
import { Button } from "~/components/ui/button";

import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import type { Route } from "./+types";
import { NotificationDropdown } from "~/features/dashboard/notification";
import { createClient } from "~/lib/supabase.server";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Dashboard | Velorent" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();

  const supabase = await createClient(request, { headers } as Response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  return data({ user }, { headers });
}

export default function Page() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-card border-b">
          <div className="max-w-7xl mx-auto p-4 md:p-6 flex h-16 shrink-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <div className="flex items-center justify-between w-full">
              <DynamicBreadcrumb />

              {(location.pathname === "/brands" ||
                location.pathname === "/coupons" ||
                location.pathname === "/models") && (
                <Link to={`${location.pathname}/new`}>
                  <Button>
                    <Plus />
                    <span>Add new</span>
                  </Button>
                </Link>
              )}
            </div>
            <NotificationDropdown />
          </div>
        </header>
        <div className="w-full flex-1 min-h-screen rounded-xl md:min-h-min">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
