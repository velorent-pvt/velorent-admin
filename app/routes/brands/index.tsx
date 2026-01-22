import { BrandList } from "~/features/brands/brand-list";
import type { Route } from "../+types";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Brands | Velorent" }];
}

export default function Brands() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <BrandList />
    </div>
  );
}
