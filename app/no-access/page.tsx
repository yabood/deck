import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

/** Shown (via proxy rewrite) when a signed-in non-admin opens /admin. */
export default async function NoAccessPage() {
  const session = await auth();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email ? (
              <>
                <span className="text-foreground">{session.user.email}</span> doesn&apos;t have admin access.
              </>
            ) : (
              "This account doesn't have admin access."
            )}{" "}
            Ask an existing admin to add you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/">Open the deck</Link>
          </Button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login?callbackUrl=/admin" });
            }}
          >
            <Button type="submit" variant="outline">
              Switch account
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
