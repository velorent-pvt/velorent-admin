import { ModelList } from "~/features/brand-models/model-list";

export default function BrandModels() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <ModelList />
    </div>
  );
}
