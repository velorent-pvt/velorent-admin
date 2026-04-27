import { DisputeList } from "~/features/disputes/dispute-list";

export default function DisputesPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <DisputeList />
    </div>
  );
}
