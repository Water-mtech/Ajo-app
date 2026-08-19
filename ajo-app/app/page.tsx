import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <h1 className="font-display text-3xl text-foreground">You&rsquo;re in.</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as <span className="font-mono">{user.email ?? user.phone}</span>. Pools and
        payouts land here in the next phase.
      </p>
    </main>
  );
}
