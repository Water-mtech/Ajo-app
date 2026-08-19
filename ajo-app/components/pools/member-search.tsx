"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

import { inviteQuerySchema, type InviteQueryInput } from "@/lib/validations/pool";
import { addPoolMember, searchUsersForInvite } from "@/app/dashboard/actions/pools";

type SearchResult = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

export function MemberSearch({
  poolId,
  existingUserIds,
}: {
  poolId: string;
  existingUserIds: string[];
}) {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();

  const form = useForm<InviteQueryInput>({
    resolver: zodResolver(inviteQuerySchema),
    defaultValues: { query: "" },
  });

  function onSearch(values: InviteQueryInput) {
    startSearch(async () => {
      const { data, error } = await searchUsersForInvite(values);
      if (error) {
        toast.error("Search failed", { description: error });
        return;
      }
      setResults(data);
      if (data.length === 0) {
        toast("No match", { description: "No one found with that email or phone number." });
      }
    });
  }

  function onAdd(userId: string) {
    startAdd(async () => {
      const { error } = await addPoolMember(poolId, userId);
      if (error) {
        toast.error("Couldn't add member", { description: error });
        return;
      }
      setAddedIds((prev) => new Set(prev).add(userId));
      toast.success("Member added");
    });
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSearch)} className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Email or +2348012345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </form>
      </Form>

      {results && results.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {results.map((person) => {
            const alreadyMember = existingUserIds.includes(person.id);
            const justAdded = addedIds.has(person.id);
            const settled = alreadyMember || justAdded;
            return (
              <li key={person.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-foreground">{person.full_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {person.email ?? person.phone}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={settled ? "outline" : "default"}
                  disabled={settled || isAdding}
                  onClick={() => onAdd(person.id)}
                >
                  {settled ? "In pool" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
