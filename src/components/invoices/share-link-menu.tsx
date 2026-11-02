"use client";

import { useTransition } from "react";
import { Link2, Link2Off, Receipt, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOrCreateShareToken, revokeShareToken } from "@/server/actions/share";

type Kind = "invoice" | "receipt";

function shareUrl(token: string, kind: Kind) {
  return `${window.location.origin}/share/${token}${kind === "receipt" ? "/receipt" : ""}`;
}

export function ShareLinkMenu({
  invoiceId,
  isPaid,
  isShared = false,
  size = "sm",
  receiptOnly = false,
}: {
  invoiceId: string;
  isPaid: boolean;
  /** Whether a link currently exists (enables "Revoke"). */
  isShared?: boolean;
  size?: "sm" | "icon";
  /** Receipts page: only offer the receipt link. */
  receiptOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function copy(kind: Kind) {
    startTransition(async () => {
      try {
        const token = await getOrCreateShareToken(invoiceId);
        const url = shareUrl(token, kind);
        await navigator.clipboard.writeText(url);
        toast.success(`${kind === "receipt" ? "Receipt" : "Invoice"} link copied`, {
          description: url,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create link");
      }
    });
  }

  function open(kind: Kind) {
    startTransition(async () => {
      try {
        const token = await getOrCreateShareToken(invoiceId);
        window.open(shareUrl(token, kind), "_blank", "noopener,noreferrer");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create link");
      }
    });
  }

  function revoke() {
    startTransition(async () => {
      try {
        await revokeShareToken(invoiceId);
        toast.success("Share link revoked", {
          description: "The old link no longer works. Sharing again creates a new one.",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to revoke link");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {size === "icon" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending} aria-label="Share link">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-9" disabled={isPending}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Share
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!receiptOnly && (
          <DropdownMenuItem onClick={() => copy("invoice")}>
            <FileText className="mr-2 h-3.5 w-3.5" /> Copy invoice link
          </DropdownMenuItem>
        )}
        {isPaid && (
          <DropdownMenuItem onClick={() => copy("receipt")}>
            <Receipt className="mr-2 h-3.5 w-3.5" /> Copy receipt link
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => open(receiptOnly ? "receipt" : "invoice")}>
          <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open public link
        </DropdownMenuItem>
        {isShared && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={revoke} className="text-red-400 focus:text-red-400">
              <Link2Off className="mr-2 h-3.5 w-3.5" /> Revoke link
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
