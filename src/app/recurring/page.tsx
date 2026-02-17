"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { RecurringInvoice, formatCurrency, getCategoryLabel } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RotateCcw, Pause, Play, Trash2, MessageCircle, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    const { data } = await supabase
      .from("recurring_invoices")
      .select("*, client:clients(*)")
      .order("created_at", { ascending: false })
    setTemplates((data || []) as RecurringInvoice[])
    setLoading(false)
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    const { error } = await supabase
      .from("recurring_invoices")
      .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) {
      toast.error("Failed to update")
      return
    }
    toast.success(currentlyActive ? "Template paused" : "Template activated")
    fetchTemplates()
  }

  async function deleteTemplate() {
    if (!deleteId) return
    // Delete items first, then the template
    await supabase.from("recurring_invoice_items").delete().eq("recurring_invoice_id", deleteId)
    const { error } = await supabase.from("recurring_invoices").delete().eq("id", deleteId)
    if (error) {
      toast.error("Failed to delete")
      return
    }
    toast.success("Recurring template deleted")
    setDeleteId(null)
    fetchTemplates()
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Recurring</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage recurring invoice templates</p>
          </div>
          <Link href="/invoices/new">
            <Button size="sm" className="h-9 rounded-full">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Invoice
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-20 text-sm">Loading...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <RotateCcw className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No recurring templates yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1 max-w-sm mx-auto">
              Create a new invoice and toggle &ldquo;Recurring Invoice&rdquo; to set up automatic invoice generation.
            </p>
            <Link href="/invoices/new" className="text-primary text-sm mt-4 inline-block hover:underline">
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs text-muted-foreground font-medium">Client</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Category</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Day</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Currency</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Auto-send</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-center">Generated</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">Next</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id} className="group border-b border-border hover:bg-secondary/50">
                    <TableCell className="text-sm font-medium">{t.client?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getCategoryLabel(t.category)}</TableCell>
                    <TableCell className="text-sm font-mono text-center">{t.day_of_month}</TableCell>
                    <TableCell className="text-sm font-mono">{t.currency}</TableCell>
                    <TableCell className="text-center">
                      {t.auto_send_whatsapp && (
                        <MessageCircle className="h-3.5 w-3.5 text-[#25D366] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-center">{t.generated_count}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          t.is_active
                            ? "bg-primary/20 text-primary"
                            : "bg-amber-500/20 text-amber-400"
                        )}
                      >
                        {t.is_active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.is_active
                        ? new Date(t.next_generation_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(t.id, t.is_active)}
                          title={t.is_active ? "Pause" : "Activate"}
                        >
                          {t.is_active
                            ? <Pause className="h-3.5 w-3.5 text-amber-400" />
                            : <Play className="h-3.5 w-3.5 text-primary" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteId(t.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring template? Previously generated invoices will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTemplate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
