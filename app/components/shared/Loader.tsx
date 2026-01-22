import LoadingAnimation from "~/assets/loading.gif";
import { cn } from "~/lib/utils";

type LoaderProps = {
  size?: number;
  className?: string;
};

export function Loader({ size = 240, className }: LoaderProps) {
  return (
    <div className="flex justify-center">
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        aria-busy="true"
        aria-live="polite"
      >
        <img
          src={LoadingAnimation}
          alt="Loading"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
