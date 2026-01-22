import { NotificationList } from "~/features/notifications/notification-list";
import type { Route } from "../+types";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Notifications | Velorent" }];
}

export default function Notifications() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <NotificationList />
    </div>
  );
}
