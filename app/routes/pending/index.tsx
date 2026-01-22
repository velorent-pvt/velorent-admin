import type { Route } from "../+types";
import { PendingCarsList } from "~/features/cars/pending-cars";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Pending Requests | Velorent" }];
}

export default function PendingRequests() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <PendingCarsList />
    </div>
  );
}
