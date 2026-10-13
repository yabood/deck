import { redirect } from "next/navigation";
import { auth, signIn, allowedDomain } from "@/auth";
import { Button } from "@/components/ui/button";

/** Only same-site paths, so a crafted link can't bounce someone off-site after sign-in. */
function safeCallbackUrl(value: string | string[] | undefined): string {
  const url = Array.isArray(value) ? value[0] : value;
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  const error =
    params.error === "AccessDenied"
      ? `That account isn't an @${allowedDomain} account. Sign in with your Elastio Google account.`
      : params.error
        ? "Sign-in didn't complete. Try again."
        : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-tight text-muted-foreground">elastio</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sales deck</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Elastio Google account to open the latest deck.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
