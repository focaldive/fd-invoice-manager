"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient, updateClient, deleteClient } from "@/server/actions/clients";
import type { listClients } from "@/server/queries/clients";

type ClientRow = Awaited<ReturnType<typeof listClients>>[number];

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", address: "", country: "" };

function toActionInput(form: FormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    country: form.country.trim() || null,
  };
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      country: client.country ?? "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    startTransition(async () => {
      try {
        const input = toActionInput(form);
        if (editing) {
          await updateClient(editing.id, input);
          toast.success("Client updated");
        } else {
          await createClient(input);
          toast.success("Client created");
        }
        setDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save client");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this client? This will not delete related invoices.")) return;
    startTransition(async () => {
      try {
        await deleteClient(id);
        toast.success("Client deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete client");
      }
    });
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Clients</h1>
        <Button size="sm" onClick={openCreate} className="h-9 rounded-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Client
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-secondary border-border rounded-full"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
              <TableHead className="hidden sm:table-cell text-xs text-muted-foreground font-medium">Email</TableHead>
              <TableHead className="hidden md:table-cell text-xs text-muted-foreground font-medium">Phone</TableHead>
              <TableHead className="hidden lg:table-cell text-xs text-muted-foreground font-medium">Country</TableHead>
              <TableHead className="w-[100px] text-xs text-muted-foreground font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No clients found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id} className="group border-b border-border hover:bg-secondary/50">
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">{client.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{client.country}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{editing ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client or company name" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 123 4567" className="mt-1.5 font-mono" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Sri Lanka" className="mt-1.5" />
            </div>
            <Button onClick={handleSave} disabled={isPending} className="w-full">
              {isPending ? "Saving..." : editing ? "Update Client" : "Create Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
