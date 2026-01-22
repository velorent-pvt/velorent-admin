import { useQuery } from "@tanstack/react-query";
import { DataTable } from "~/components/ui/data-table";
import { Loader } from "~/components/shared/Loader";

import { getAllNotifications } from "~/api/notificatiions";
import { notificationColumns } from "./columns";
import { supabase } from "~/lib/supabase";

async function fetchNotifications(): Promise<Notification[]> {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("role_id", 1)
    .single();

  if (!admin) return [];

  return (await getAllNotifications(admin.id)) ?? [];
}

export function NotificationList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: fetchNotifications,
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <DataTable
      data={data}
      columns={notificationColumns}
      searchColumn="title"
      searchPlaceholder="Search notification..."
      title="Notifications"
    />
  );
}
