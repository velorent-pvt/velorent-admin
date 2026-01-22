import { Bell, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

import { supabase } from "~/lib/supabase";
import { getUnreadNotifications } from "~/api/notificatiions";

type Notification = {
  id: string;
  title: string;
  message?: string;
  link?: string;
  created_at: string;
  is_read: boolean;
};

async function fetchNotifications(): Promise<Notification[]> {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("role_id", 1)
    .single();

  if (!admin) return [];

  return (await getUnreadNotifications(admin.id)) ?? [];
}

export function NotificationDropdown() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 1000 * 30,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },

    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previous = queryClient.getQueryData<Notification[]>([
        "notifications",
      ]);

      queryClient.setQueryData<Notification[]>(["notifications"], (old) =>
        old?.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      queryClient.setQueryData(["notifications"], context?.previous);
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex justify-center my-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notifications
            </p>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.link ?? "#"}
                  onClick={() =>
                    !notification.is_read &&
                    markAsReadMutation.mutate(notification.id)
                  }
                >
                  <div
                    className={cn(
                      "px-4 py-3 text-sm hover:bg-muted cursor-pointer",
                      !notification.is_read && "bg-muted/50",
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <p className="font-medium leading-tight">
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>

                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
