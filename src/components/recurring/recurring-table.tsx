"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Pause, Play, Trash2, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/types";
import {
  setRecurringActive,
  deleteRecurringTemplate,
} from "@/server/actions/recurring";
import type { listRecurringTemplates } from "@/server/queries/recurring";

type Template = Awaited<ReturnType<typeof listRecurringTemplates>>[number];

export function RecurringTable({ templates }: { templates: Template[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleActive(id: string, currentlyActive: boolean) {
    startTransition(async () => {
      try {
        await setRecurringActive(id, !currentlyActive);
        toast.success(currentlyActive ? "Template paused" : "Template activated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      try {
        await deleteRecurringTemplate(id);
        toast.success("Recurring template deleted");
        setDeleteId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <>
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

        {templates.length === 0 ? (
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
                    <TableCell className="text-sm font-mono text-center">{t.dayOfMonth}</TableCell>
                    <TableCell className="text-sm font-mono">{t.currency}</TableCell>
                    <TableCell className="text-center">
                      {t.autoSendWhatsapp && (
                        <MessageCircle className="h-3.5 w-3.5 text-[#25D366] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-center">{t.generatedCount}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0",
                          t.isActive
                            ? "bg-primary/20 text-primary"
                            : "bg-amber-500/20 text-amber-400"
                        )}
                      >
                        {t.isActive ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.isActive
                        ? new Date(t.nextGenerationDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(t.id, t.isActive)}
                          disabled={isPending}
                          title={t.isActive ? "Pause" : "Activate"}
                        >
                          {t.isActive
                            ? <Pause className="h-3.5 w-3.5 text-amber-400" />
                            : <Play className="h-3.5 w-3.5 text-primary" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteId(t.id)}
                          disabled={isPending}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring template? Previously generated invoices will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
