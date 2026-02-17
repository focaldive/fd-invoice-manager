import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Invoice,
  InvoiceItem,
  Settings,
  COMPANY,
  formatCurrency,
} from "./types";

// Pre-rendered FocalDive logo as base64 PNG (200x200)
// Generated from public/logo.svg via sharp — flattened to white background for jsPDF compatibility
const LOGO_PNG_DATA_URL =
  "data:image/png;base64,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";

// Get logo data URL — uses pre-rendered PNG (works in both browser and server)
function getLogoDataUrl(): Promise<string> {
  return Promise.resolve(LOGO_PNG_DATA_URL);
}

export type PDFOutputMode = "download" | "base64" | "arraybuffer";

export async function generateInvoicePDF(
  invoice: Invoice & { items: InvoiceItem[]; client?: any },
  settings?: Settings | null,
  outputMode: PDFOutputMode = "download",
): Promise<string | ArrayBuffer | void> {
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
  doc.text("Invoice", marginLeft, y + 6);

  y += 22;

  // ============================================
  // Invoice metadata (number, dates)
  // ============================================
  const labelX = marginLeft;
  const valueX = marginLeft + 36;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Invoice number", labelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number, valueX, y);

  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...black);
  doc.text("Date of issue", labelX, y);
  doc.setTextColor(...black);
  doc.text(formatDate(invoice.date_of_issue), valueX, y);

  y += 5.5;
  doc.setTextColor(...black);
  doc.text("Date due", labelX, y);
  doc.setTextColor(...black);
  doc.text(formatDate(invoice.date_due), valueX, y);

  y += 14;

  // ============================================
  // ADDRESSES - side by side
  // ============================================
  const addrStartY = y;
  const rightColX = marginLeft + contentWidth * 0.48;

  // Use settings if provided, otherwise fall back to COMPANY constant
  const companyName = (settings?.company_name || COMPANY.name).replace(
    /\n/g,
    " ",
  );
  const companyEmail = settings?.company_email || COMPANY.email;
  const companyPhone = settings?.company_phone || COMPANY.phone;
  const companyAddress = settings?.company_address || COMPANY.address;

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
  const amountDueText = `${fmt(Number(invoice.total))} ${invoice.currency} due ${formatDate(invoice.date_due)}`;
  doc.text(amountDueText, marginLeft, y);

  y += 16;

  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  const tableHead = [["Description", "Qty", "Unit price", "Amount"]];
  const tableBody = invoice.items.map((item) => [
    item.description,
    String(item.quantity),
    fmt(Number(item.unit_price)),
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
  if (Number(invoice.tax_percentage) > 0) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(totalsLeftX, y, totalsRightX, y);
    y += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
    doc.text(`Tax (${invoice.tax_percentage}%)`, totalsLeftX, y - textOffset);
    doc.text(fmt(Number(invoice.tax_amount)), totalsRightX, y - textOffset, {
      align: "right",
    });
  }

  // Discount if applicable
  if (Number(invoice.discount_amount) > 0) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(totalsLeftX, y, totalsRightX, y);
    y += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
    const discountLabel = Number(invoice.discount_percentage) > 0
      ? `Discount (${invoice.discount_percentage}%)`
      : `Discount`;
    doc.text(
      discountLabel,
      totalsLeftX,
      y - textOffset,
    );
    doc.text(
      `-${fmt(Number(invoice.discount_amount))}`,
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
  doc.text("Amount due", totalsLeftX, y - textOffset);
  doc.text(`${fmt(Number(invoice.total))}`, totalsRightX, y - textOffset, {
    align: "right",
  });

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
      doc.save(`${invoice.invoice_number}.pdf`);
      return;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
