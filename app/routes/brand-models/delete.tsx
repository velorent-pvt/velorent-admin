import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { StatefulButton } from "~/components/ui/stateful-button";
import type { Route } from "./+types";
import { deleteCarModel } from "~/api/models";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Delete model | Velorent" }];
}

export default function ModelDeletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const id = searchParams.get("id");
  const title = searchParams.get("title");

  useEffect(() => {
    if (!id || !title) navigate("/");
  }, [id, navigate]);

  const { mutate, status } = useMutation({
    mutationFn: deleteCarModel,

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["models"],
      });
      navigate("/models");
      toast.success("Model deleted successfully");
    },
  });

  function handleDelete() {
    if (!id) return;
    mutate(id);
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <div className="flex items-center gap-2 text-destructive mb-4">
        <h1 className="text-3xl font-bold">Are you sure?</h1>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground mb-6">
        You are about to permanently delete the model&nbsp;
        <span className="font-semibold text-foreground">{title}</span>. This
        action cannot be undone and all related data will be removed.
      </p>

      <div className="flex gap-3">
        <StatefulButton
          status={status}
          variant="destructive"
          onClick={handleDelete}
        >
          Delete
        </StatefulButton>
        <Button variant="secondary" onClick={() => navigate("/models")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
