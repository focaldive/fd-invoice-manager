"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Client } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", country: "" })

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase.from("clients").select("*").order("name")
    setClients(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: "", email: "", phone: "", address: "", country: "" })
    setDialogOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      country: client.country || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Client name is required"); return }
    if (editing) {
      const { error } = await supabase.from("clients").update(form).eq("id", editing.id)
      if (error) { toast.error("Failed to update client"); return }
      toast.success("Client updated")
    } else {
      const { error } = await supabase.from("clients").insert(form)
      if (error) { toast.error("Failed to create client"); return }
      toast.success("Client created")
    }
    setDialogOpen(false)
    fetchClients()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client? This will not delete related invoices.")) return
    const { error } = await supabase.from("clients").delete().eq("id", id)
    if (error) { toast.error("Failed to delete client"); return }
    toast.success("Client deleted")
    fetchClients()
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-5xl font-bold tracking-tight">Clients</h1>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground text-sm">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
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
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)}>
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
              <DialogTitle className="text-lg font-bold">{editing ? "Edit Client" : "Add Client"}</DialogTitle>
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
              <Button onClick={handleSave} className="w-full">{editing ? "Update Client" : "Create Client"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
