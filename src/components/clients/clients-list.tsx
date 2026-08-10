"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { ClientDialog } from "@/components/clients/client-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { initials } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ClientsList({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.category ?? "").toLowerCase().includes(q) ||
      (c.username ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-8"
          />
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus /> Add client
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={
            query
              ? "No clients match your search."
              : "Add your first client or import your spreadsheet."
          }
          action={
            !query && (
              <Button onClick={() => setOpen(true)}>
                <Plus /> Add client
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">{initials(client.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{client.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.company ?? client.category ?? client.platform ?? "No details"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {client.platform && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize">
                    {client.platform}
                  </span>
                )}
                {client.category && (
                  <span className="truncate rounded-full bg-muted px-2 py-0.5">{client.category}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <ClientDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) router.replace("/clients");
        }}
      />
    </>
  );
}
