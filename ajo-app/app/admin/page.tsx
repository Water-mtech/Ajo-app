export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <h1 className="font-display text-3xl text-foreground">Admin console</h1>
      <p className="mt-2 text-muted-foreground">
        Only reachable by profiles with <span className="font-mono">is_admin = true</span> —
        middleware.ts checks this before the page ever renders.
      </p>
    </main>
  );
}
