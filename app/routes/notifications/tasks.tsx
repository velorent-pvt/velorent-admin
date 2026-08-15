import { TaskNotifications } from "~/features/notifications/task-notifications";
import type { Route } from "../+types";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Task Notifications | Velorent" }];
}

export default function TaskNotificationsPage() {
  return (
    <div className="mx-auto my-6 flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <TaskNotifications />
    </div>
  );
}
