import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Invoice,
  InvoiceItem,
  Settings,
  COMPANY,
  formatCurrency,
  getPaidDate,
  getReceiptNumber,
} from "./types";

// Pre-rendered FocalDive emblem on a dark tile, 200x200 PNG.
// Regenerate with `node scripts/gen-logo-base64.js` (renders src/app/icon.svg).
const LOGO_PNG_DATA_URL =
  "data:image/png;base64,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";

// Get logo data URL — uses pre-rendered PNG (works in both browser and server)
export function getLogoDataUrl(): Promise<string> {
  return Promise.resolve(LOGO_PNG_DATA_URL);
}

export type PDFOutputMode = "download" | "base64" | "arraybuffer";

/**
 * "invoice" — the regular invoice (amount due).
 * "receipt" — proof of payment for a paid invoice: retitled, shows the
 *             paid date / amount paid, and carries a red PAID stamp.
 */
export type PDFVariant = "invoice" | "receipt";

export async function generateInvoicePDF(
  invoice: Invoice & { items: InvoiceItem[]; client?: any },
  settings?: Settings | null,
  outputMode: PDFOutputMode = "download",
  variant: PDFVariant = "invoice",
): Promise<string | ArrayBuffer | void> {
  const isReceipt = variant === "receipt";
  const paidDate = isReceipt ? getPaidDate(invoice) : null;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const marginLeft = 12;
  const marginRight = 12;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 12;

  // Colors
  const black: [number, number, number] = [0, 0, 0];
  const gray: [number, number, number] = [0, 0, 0];

  // Helper for currency formatting
  const fmt = (amount: number) => formatCurrency(amount, invoice.currency);

  // ============================================
  // LOGO - top right, inside a dark rounded square
  // ============================================
  const logoSize = 12;
  const logoX = pageWidth - marginRight - logoSize;
  const logoY = y - 4;

  // Draw dark background box for logo
  // doc.roundedRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4, 2, 2, "F")

  // Try to add the actual logo image
  try {
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    }
  } catch {
    // Fallback: just show the dark box
  }

  // ============================================
  // "Invoice" title - top left
  // ============================================
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(isReceipt ? "Receipt" : "Invoice", marginLeft, y + 6);

  y += 22;

  // ============================================
  // Invoice metadata (number, dates)
  // ============================================
  const labelX = marginLeft;
  const valueX = marginLeft + 36;

  doc.setFontSize(9);
  doc.setTextColor(...black);
  if (isReceipt) {
    doc.setFont("helvetica", "bold");
    doc.text("Receipt number", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(getReceiptNumber(invoice.invoiceNumber), valueX, y);
    y += 5.5;
  }
  doc.setFont("helvetica", isReceipt ? "normal" : "bold");
  doc.text("Invoice number", labelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, valueX, y);

  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  doc.text("Date of issue", labelX, y);
  doc.setTextColor(...black);
  doc.text(formatDate(invoice.dateOfIssue), valueX, y);

  y += 5.5;
  doc.setTextColor(...black);
  doc.text("Date due", labelX, y);
  doc.setTextColor(...black);
  doc.text(formatDate(invoice.dateDue), valueX, y);

  if (isReceipt && paidDate) {
    y += 5.5;
    doc.setFont("helvetica", "bold");
    doc.text("Date paid", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(paidDate), valueX, y);
  }

  y += 14;

  // ============================================
  // ADDRESSES - side by side
  // ============================================
  const addrStartY = y;
  const rightColX = marginLeft + contentWidth * 0.48;

  // Use settings if provided, otherwise fall back to COMPANY constant
  const companyName = (settings?.companyName || COMPANY.name).replace(
    /\n/g,
    " ",
  );
  const companyEmail = settings?.companyEmail || COMPANY.email;
  const companyPhone = settings?.companyPhone || COMPANY.phone;
  const companyAddress = settings?.companyAddress || COMPANY.address;

  // Left: Company
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(companyName, marginLeft, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  const addressLines = companyAddress
    .split("\n")
    .join(", ")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const line of addressLines) {
    doc.text(line, marginLeft, y);
    y += 4.5;
  }
  doc.text(companyEmail, marginLeft, y);
  if (companyPhone) {
    y += 4.5;
    doc.text(companyPhone, marginLeft, y);
  }

  // Right: Bill to
  let ry = addrStartY;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray);
  doc.text("Bill to", rightColX, ry);
  ry += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text(invoice.client?.name || "N/A", rightColX, ry);
  ry += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  if (invoice.client?.address) {
    doc.text(invoice.client.address, rightColX, ry);
    ry += 4.5;
  }
  if (invoice.client?.country) {
    doc.text(invoice.client.country, rightColX, ry);
    ry += 4.5;
  }
  if (invoice.client?.email) {
    doc.text(invoice.client.email, rightColX, ry);
    ry += 4.5;
  }
  if (invoice.client?.phone) {
    doc.text(invoice.client.phone, rightColX, ry);
  }

  y += 18;

  // ============================================
  // AMOUNT DUE LINE (no background, just bold text)
  // ============================================
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  const amountDueText = isReceipt && paidDate
    ? `${fmt(Number(invoice.total))} ${invoice.currency} paid ${formatDate(paidDate)}`
    : `${fmt(Number(invoice.total))} ${invoice.currency} due ${formatDate(invoice.dateDue)}`;
  doc.text(amountDueText, marginLeft, y);

  y += 16;

  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  const tableHead = [["Description", "Qty", "Unit price", "Amount"]];
  const tableBody = invoice.items.map((item) => [
    item.description,
    String(item.quantity),
    fmt(Number(item.unitPrice)),
    fmt(Number(item.amount)),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: marginLeft, right: marginRight },
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 0, left: 0, right: 0 },
      textColor: [30, 30, 30],
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [100, 100, 100],
      fontStyle: "normal",
      fontSize: 8,
      cellPadding: { top: 1, bottom: 2, left: 0, right: 0 },
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5, halign: "left" },
      1: { cellWidth: contentWidth * 0.12, halign: "right" },
      2: { cellWidth: contentWidth * 0.19, halign: "right" },
      3: { cellWidth: contentWidth * 0.19, halign: "right" },
    },
    theme: "plain",
    didParseCell: (data: any) => {
      // Right-align header cells for Qty, Unit price, Amount
      if (data.section === "head" && data.column.index > 0) {
        data.cell.styles.halign = "right";
      }
    },
    didDrawCell: (data: any) => {
      // Thin line under header row only
      if (data.section === "head") {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        const bottomY = data.cell.y + data.cell.height;
        doc.line(data.cell.x, bottomY, data.cell.x + data.cell.width, bottomY);
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ============================================
  // TOTALS — right-aligned block with lines above each row
  // ============================================
  const totalsWidth = 90;
  const totalsLeftX = pageWidth - marginRight - totalsWidth;
  const totalsRightX = pageWidth - marginRight;
  const rowHeight = 8;
  const textOffset = 3;

  // PAID stamp — sits in the empty space left of the totals block.
  if (isReceipt && paidDate) {
    drawPaidStamp(doc, marginLeft + 40, y + 18, formatDate(paidDate));
  }

  // Subtotal
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.15);
  doc.line(totalsLeftX, y, totalsRightX, y);
  y += rowHeight;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  doc.text("Subtotal", totalsLeftX, y - textOffset);
  doc.text(fmt(Number(invoice.subtotal)), totalsRightX, y - textOffset, {
    align: "right",
  });

  // Tax if applicable
  if (Number(invoice.taxPercentage) > 0) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(totalsLeftX, y, totalsRightX, y);
    y += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
    doc.text(`Tax (${invoice.taxPercentage}%)`, totalsLeftX, y - textOffset);
    doc.text(fmt(Number(invoice.taxAmount)), totalsRightX, y - textOffset, {
      align: "right",
    });
  }

  // Discount if applicable
  if (Number(invoice.discountAmount) > 0) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(totalsLeftX, y, totalsRightX, y);
    y += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
    const discountLabel = Number(invoice.discountPercentage) > 0
      ? `Discount (${invoice.discountPercentage}%)`
      : `Discount`;
    doc.text(
      discountLabel,
      totalsLeftX,
      y - textOffset,
    );
    doc.text(
      `-${fmt(Number(invoice.discountAmount))}`,
      totalsRightX,
      y - textOffset,
      { align: "right" },
    );
  }

  // Total
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.15);
  doc.line(totalsLeftX, y, totalsRightX, y);
  y += rowHeight;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  doc.text("Total", totalsLeftX, y - textOffset);
  doc.text(fmt(Number(invoice.total)), totalsRightX, y - textOffset, {
    align: "right",
  });

  // Amount due — bold, extra top spacing
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(totalsLeftX, y, totalsRightX, y);
  y += rowHeight;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  if (isReceipt) {
    doc.text("Amount paid", totalsLeftX, y - textOffset);
    doc.text(`${fmt(Number(invoice.total))}`, totalsRightX, y - textOffset, {
      align: "right",
    });
    y += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.text("Balance due", totalsLeftX, y - textOffset);
    doc.text(fmt(0), totalsRightX, y - textOffset, { align: "right" });
  } else {
    doc.text("Amount due", totalsLeftX, y - textOffset);
    doc.text(`${fmt(Number(invoice.total))}`, totalsRightX, y - textOffset, {
      align: "right",
    });
  }

  // ============================================
  // FOOTER - Notes
  // ============================================
  if (invoice.notes) {
    y += 24;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    const lines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(lines, marginLeft, y);
  }

  // Page number
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 12, {
      align: "center",
    });
  }

  // Output
  switch (outputMode) {
    case "base64":
      return doc.output("datauristring").split(",")[1];
    case "arraybuffer":
      return doc.output("arraybuffer");
    case "download":
    default:
      doc.save(`${isReceipt ? getReceiptNumber(invoice.invoiceNumber) : invoice.invoiceNumber}.pdf`);
      return;
  }
}

/**
 * Red rubber-stamp style "PAID" mark, tilted ~12° counter-clockwise.
 * Drawn as vectors (double border + text) so it stays crisp at any zoom.
 * (cx, cy) is the stamp centre in mm.
 */
function drawPaidStamp(doc: jsPDF, cx: number, cy: number, dateLabel: string) {
  const red: [number, number, number] = [214, 38, 38];
  const angleDeg = 12;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Local (unrotated) coords → page coords. jsPDF's y axis points down, so a
  // counter-clockwise visual rotation lifts points on the right side upward.
  const toPage = (lx: number, ly: number): [number, number] => [
    cx + lx * cos + ly * sin,
    cy - lx * sin + ly * cos,
  ];

  const drawRotatedRect = (halfW: number, halfH: number) => {
    const corners = [
      toPage(-halfW, -halfH),
      toPage(halfW, -halfH),
      toPage(halfW, halfH),
      toPage(-halfW, halfH),
    ];
    const deltas = corners.slice(1).map((c, i) => [c[0] - corners[i][0], c[1] - corners[i][1]]);
    doc.lines(deltas, corners[0][0], corners[0][1], [1, 1], "S", true);
  };

  // Draws text centred on local point (lx, baseline ly), rotated with the stamp.
  const drawRotatedText = (text: string, lx: number, ly: number) => {
    const w = doc.getTextWidth(text);
    const [x, y] = toPage(lx - w / 2, ly);
    doc.text(text, x, y, { angle: angleDeg });
  };

  type GStateCtor = new (p: { opacity: number; "stroke-opacity": number }) => unknown;
  const GState = (doc as unknown as { GState?: GStateCtor }).GState;
  const setAlpha = (a: number) => {
    if (GState) doc.setGState(new GState({ opacity: a, "stroke-opacity": a }));
  };
  setAlpha(0.85);

  doc.setDrawColor(...red);
  doc.setTextColor(...red);

  doc.setLineWidth(1.1);
  drawRotatedRect(30, 12);
  doc.setLineWidth(0.35);
  drawRotatedRect(28, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  drawRotatedText("PAID", 0, 1.2);

  doc.setFontSize(7.5);
  drawRotatedText(dateLabel.toUpperCase(), 0, 7);

  setAlpha(1);

  // Reset state for subsequent drawing.
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
