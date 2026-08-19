import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt and suspenders — middleware already guards this, but a Server
  // Component shouldn't assume a request ever reaches it any other way.
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link
            href="/dashboard/my-pools"
            className="shrink-0 font-display text-xl italic text-primary"
          >
            Ajo
          </Link>
          {/* Scrolls horizontally on narrow screens rather than wrapping
              onto a second line — keeps the header a fixed height. */}
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto text-sm sm:gap-2">
            <Link
              href="/dashboard/my-pools"
              className="shrink-0 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              My pools
            </Link>
            <Link
              href="/dashboard/pools/new"
              className="shrink-0 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              New pool
            </Link>
            <Link
              href="/dashboard/member"
              className="shrink-0 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              My overview
            </Link>
            <Link
              href="/dashboard/admin"
              className="shrink-0 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin overview
            </Link>
            <ThemeToggle />
            <form action={signOut} className="shrink-0">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
