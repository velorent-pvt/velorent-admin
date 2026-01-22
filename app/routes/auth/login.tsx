import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "~/components/ui/input-group";
import type { Route } from "../../+types/root";
import { redirect, useFetcher } from "react-router";
import { Mail, Lock, Loader2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "~/lib/supabase.server";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const headers = new Headers();

  const result = loginSchema.safeParse({ email, password });

  if (!result.success) {
    return {
      errors: z.treeifyError(result.error).properties,
      values: { email, password },
    };
  }

  const supabase = await createClient(request, { headers } as Response);

  const {
    error,
    data: { user },
  } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return {
      errors: {
        email: {
          errors: [error.message],
        },
        password: {
          errors: [],
        },
      },
    };
  }

  const profile = await supabase
    .from("profiles")
    .select()
    .eq("id", user?.id)
    .single();

  if (profile.data.role_id !== 1) {
    return {
      errors: {
        email: {
          errors: ["Invalid user"],
        },
        password: {
          errors: [],
        },
      },
    };
  }

  return redirect("/", {
    headers,
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();

  const supabase = await createClient(request, { headers } as Response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(user);

  if (user) return redirect("/");

  return null;
}

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Login | Velorent" }];
}

export default function Login() {
  const fetcher = useFetcher<typeof action>();
  const isSubmitting = fetcher.state === "submitting";
  const errors = fetcher.data?.errors;
  const values = fetcher.data?.values;

  return (
    <div className="min-h-screen flex">
      <fetcher.Form
        method="post"
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
      >
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Admin Login
            </h1>
            <p className="text-muted-foreground">Access your admin dashboard</p>
          </div>

          <div className="space-y-6">
            <div>
              <InputGroup>
                <InputGroupAddon>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  name="email"
                  placeholder="Email address"
                  type="email"
                  defaultValue={values?.email as string}
                  required
                />
              </InputGroup>
              {errors?.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.errors[0]}
                </p>
              )}
            </div>

            <div>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  name="password"
                  placeholder="Password"
                  type="password"
                  defaultValue={values?.password as string}
                  required
                />
              </InputGroup>
              {errors?.password && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password.errors[0]}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Login"
              )}
            </Button>
          </div>
        </div>
      </fetcher.Form>

      <div
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/admin.avif')" }}
      >
        <div className="absolute inset-0 bg-primary/40"></div>
      </div>
    </div>
  );
}
