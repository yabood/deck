import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/admin" className="text-sm font-semibold">
              Elastio Deck Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Open deck
            </Link>
            {session?.user?.email && <span>{session.user.email}</span>}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl w-full flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
