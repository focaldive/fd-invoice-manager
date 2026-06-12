import jsPDF from "jspdf";
import {
  Payslip,
  PayslipItem,
  Employee,
  Settings,
  COMPANY,
  formatCurrency,
  getMonthLabel,
  getPaymentModeLabel,
} from "./types";
import { getLogoDataUrl } from "./pdf";

export type PDFOutputMode = "download" | "base64" | "arraybuffer";

export async function generatePayslipPDF(
  payslip: Payslip & { items: PayslipItem[]; employee?: Employee | null },
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

  const black: [number, number, number] = [0, 0, 0];
  const gray: [number, number, number] = [110, 110, 110];

  const fmt = (amount: number) => formatCurrency(amount, payslip.currency);

  // ============================================
  // LOGO — top right
  // ============================================
  const logoSize = 12;
  const logoX = pageWidth - marginRight - logoSize;
  const logoY = y - 4;
  try {
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    }
  } catch {
    // No logo — continue without it
  }

  // ============================================
  // "PAYSLIP" title — top left
  // ============================================
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("PAYSLIP", marginLeft, y + 6);

  y += 18;

  // ============================================
  // Payslip metadata (slip number, month, payment mode)
  // ============================================
  const labelX = marginLeft;
  const valueX = marginLeft + 32;

  const meta: [string, string][] = [
    ["Slip Number:", payslip.slipNumber],
    ["For month of:", getMonthLabel(payslip.payPeriodMonth).toUpperCase()],
    ["Payment mode:", getPaymentModeLabel(payslip.paymentMode)],
  ];

  doc.setFontSize(9);
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(value, valueX, y);
    y += 5.5;
  }

  y += 12;

  // ============================================
  // COMPANY (left) + PAYEE DETAILS (right)
  // ============================================
  const blockStartY = y;
  const rightColX = marginLeft + contentWidth * 0.48;

  const companyName = (settings?.companyName || COMPANY.name).replace(/\n/g, " ");
  const companyEmail = settings?.companyEmail || COMPANY.email;
  const companyAddress = settings?.companyAddress || COMPANY.address;

  // Left: company
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

  // Right: payee details
  const emp = payslip.employee;
  let ry = blockStartY;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Payee Details", rightColX, ry);
  ry += 6;

  const payeeValueX = rightColX + 28;
  const payeeRows: [string, string][] = [
    ["Name:", emp?.name || "N/A"],
    ["Emp No:", emp?.employeeNumber || "N/A"],
    ["Department:", emp?.department || "N/A"],
    ["Designation:", emp?.designation || "N/A"],
    ["Payment date:", formatDate(payslip.paymentDate)],
  ];
  doc.setFontSize(9);
  for (const [label, value] of payeeRows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(label, rightColX, ry);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(value, payeeValueX, ry);
    ry += 5.5;
  }

  y = Math.max(y, ry) + 14;

  // ============================================
  // LINE ITEMS — Description / Amount
  // ============================================
  const amountRightX = pageWidth - marginRight;

  // Header row
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("Description", marginLeft, y);
  doc.text("Amount", amountRightX, y, { align: "right" });
  y += 2.5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, y, amountRightX, y);
  y += 6;

  // Rows — earnings positive, deductions negative
  doc.setFontSize(9);
  for (const item of payslip.items) {
    const amount = Number(item.amount);
    const signed = item.type === "deduction" ? -amount : amount;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
    doc.text(item.description, marginLeft, y);
    doc.text(fmt(signed), amountRightX, y, { align: "right" });
    y += 6.5;
  }

  // ============================================
  // NET PAY — bold, with a divider above
  // ============================================
  const netLineLeftX = marginLeft + contentWidth * 0.4;
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(netLineLeftX, y, amountRightX, y);
  y += 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Net Pay", netLineLeftX, y);
  doc.text(fmt(Number(payslip.netPay)), amountRightX, y, { align: "right" });

  // ============================================
  // NOTES (optional)
  // ============================================
  if (payslip.notes) {
    y += 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    const lines = doc.splitTextToSize(payslip.notes, contentWidth);
    doc.text(lines, marginLeft, y);
  }

  // ============================================
  // AUTHORIZED BY — bottom of page
  // ============================================
  if (payslip.authorizedByName) {
    const authY = pageHeight - 40;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text("Authorized By:", marginLeft, authY);

    // Small space left for a signature
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(payslip.authorizedByName, marginLeft, authY + 9);
    if (payslip.authorizedByTitle) {
      doc.text(payslip.authorizedByTitle, marginLeft, authY + 14);
    }
  }

  // ============================================
  // FOOTER — computer-generated note, bottom center
  // ============================================
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This is a computer-generated payslip and does not require a signature.",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" },
  );

  // Output
  switch (outputMode) {
    case "base64":
      return doc.output("datauristring").split(",")[1];
    case "arraybuffer":
      return doc.output("arraybuffer");
    case "download":
    default:
      doc.save(`${payslip.slipNumber}.pdf`);
      return;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
