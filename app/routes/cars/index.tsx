import { ApprovedCarsList } from "~/features/cars/approved-cars";

export default function Cars() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <ApprovedCarsList />
    </div>
  );
}
