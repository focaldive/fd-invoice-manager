import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Invoice, InvoiceItem, Settings, COMPANY, formatCurrency } from "./types"

// Pre-render the SVG logo to a canvas and return as data URL
function getLogoDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="200" height="200"><path fill="#000" d="M950.09,263.49,813.67,184.73V422l-69.09,39.91L521.27,590.81,335.42,698.1V934.86l34.23,19.82L539.92,1053H540L983.73,796.79V282.89ZM813.67,698.32l-69.09,39.91L521.27,867.16V787.44L744.58,658.51l69.09-39.91Z"/><polygon fill="#09c880" points="710.78 125.32 521.27 234.74 335.42 342.04 266.33 381.9 96.27 480.11 96.27 283.47 266.33 185.26 335.42 145.41 521.27 38.11 540.5 27 710.78 125.32"/><polygon fill="#09c880" points="744.58 185.53 744.58 382.16 521.27 511.09 335.42 618.39 266.33 658.25 96.27 756.46 96.27 559.82 266.33 461.61 335.42 421.75 521.27 314.46 744.58 185.53"/><polygon fill="#09c880" points="266.33 737.96 266.33 895 130.34 816.51 266.33 737.96"/></svg>`
    const canvas = document.createElement("canvas")
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 200, 200)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve("")
    }
    img.src = url
  })
}

export async function generateInvoicePDF(invoice: Invoice & { items: InvoiceItem[]; client?: any }, settings?: Settings | null) {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth() // 210
  const pageHeight = doc.internal.pageSize.getHeight() // 297
  const marginLeft = 12
  const marginRight = 12
  const contentWidth = pageWidth - marginLeft - marginRight
  let y = 12

  // Colors
  const black: [number, number, number] = [0, 0, 0]
  const gray: [number, number, number] = [110, 110, 110]

  // Helper for currency formatting
  const fmt = (amount: number) => formatCurrency(amount, invoice.currency)

  // ============================================
  // LOGO - top right, inside a dark rounded square
  // ============================================
  const logoSize = 12
  const logoX = pageWidth - marginRight - logoSize
  const logoY = y - 4

  // Draw dark background box for logo
  // doc.roundedRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4, 2, 2, "F")

  // Try to add the actual logo image
  try {
    const logoDataUrl = await getLogoDataUrl()
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize)
    }
  } catch {
    // Fallback: just show the dark box
  }

  // ============================================
  // "Invoice" title - top left
  // ============================================
  doc.setFontSize(26)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text("Invoice", marginLeft, y + 6)

  y += 22

  // ============================================
  // Invoice metadata (number, dates)
  // ============================================
  const labelX = marginLeft
  const valueX = marginLeft + 36

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text("Invoice number", labelX, y)
  doc.setFont("helvetica", "normal")
  doc.text(invoice.invoice_number, valueX, y)

  y += 5.5
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Date of issue", labelX, y)
  doc.setTextColor(...black)
  doc.text(formatDate(invoice.date_of_issue), valueX, y)

  y += 5.5
  doc.setTextColor(...gray)
  doc.text("Date due", labelX, y)
  doc.setTextColor(...black)
  doc.text(formatDate(invoice.date_due), valueX, y)

  y += 14

  // ============================================
  // ADDRESSES - side by side
  // ============================================
  const addrStartY = y
  const rightColX = marginLeft + contentWidth * 0.48

  // Use settings if provided, otherwise fall back to COMPANY constant
  const companyName = settings?.company_name || COMPANY.name
  const companyEmail = settings?.company_email || COMPANY.email
  const companyAddress = settings?.company_address || COMPANY.address

  // Left: Company
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text(companyName, marginLeft, y)
  y += 5
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  const addressLines = companyAddress.split('\n').join(', ').split(',').map(s => s.trim()).filter(Boolean)
  for (const line of addressLines) {
    doc.text(line, marginLeft, y)
    y += 4.5
  }
  doc.text(companyEmail, marginLeft, y)

  // Right: Bill to
  let ry = addrStartY
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...gray)
  doc.text("Bill to", rightColX, ry)
  ry += 5
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text(invoice.client?.name || "N/A", rightColX, ry)
  ry += 5
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  if (invoice.client?.address) {
    doc.text(invoice.client.address, rightColX, ry)
    ry += 4.5
  }
  if (invoice.client?.country) {
    doc.text(invoice.client.country, rightColX, ry)
    ry += 4.5
  }
  if (invoice.client?.email) {
    doc.text(invoice.client.email, rightColX, ry)
  }

  y += 18

  // ============================================
  // AMOUNT DUE LINE (no background, just bold text)
  // ============================================
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  const currencySuffix = invoice.currency === "USD" ? " USD" : ""
  const amountDueText = `${fmt(Number(invoice.total))}${currencySuffix} due ${formatDate(invoice.date_due)}`
  doc.text(amountDueText, marginLeft, y)

  y += 16

  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  const tableHead = [["Description", "Qty", "Unit price", "Amount"]]
  const tableBody = invoice.items.map((item) => [
    item.description,
    String(item.quantity),
    fmt(Number(item.unit_price)),
    fmt(Number(item.amount)),
  ])

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: marginLeft, right: marginRight },
      styles: {
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
        textColor: [40, 40, 40],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [80, 80, 80],
        fontStyle: "normal",
        fontSize: 8.5,
        cellPadding: { top: 3, bottom: 5, left: 2, right: 2 },
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.46, halign: "left" },
        1: { cellWidth: contentWidth * 0.12, halign: "right" },
        2: { cellWidth: contentWidth * 0.21, halign: "right" },
        3: { cellWidth: contentWidth * 0.21, halign: "right" },
      },
      theme: "plain",
      didDrawCell: (data: any) => {
        // Draw bottom border under head row only
        if (data.section === "head") {
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(0.15)
          const bottomY = data.cell.y + data.cell.height
          doc.line(data.cell.x, bottomY, data.cell.x + data.cell.width, bottomY)
        }
      },
    })

  y = (doc as any).lastAutoTable.finalY + 16

  // ============================================
  // TOTALS (right-aligned, in a half-width area)
  // ============================================
  const totalsLeftX = pageWidth - marginRight - 80
  const totalsRightX = pageWidth - marginRight

  // Subtotal
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Subtotal", totalsLeftX, y)
  doc.setTextColor(...black)
  doc.text(fmt(Number(invoice.subtotal)), totalsRightX, y, { align: "right" })

  // Tax if applicable
  if (Number(invoice.tax_percentage) > 0) {
    y += 6
    doc.setTextColor(...gray)
    doc.text(`Tax (${invoice.tax_percentage}%)`, totalsLeftX, y)
    doc.setTextColor(...black)
    doc.text(fmt(Number(invoice.tax_amount)), totalsRightX, y, { align: "right" })
  }

  // Discount if applicable
  if (Number(invoice.discount_percentage) > 0) {
    y += 6
    doc.setTextColor(...gray)
    doc.text(`Discount (${invoice.discount_percentage}%)`, totalsLeftX, y)
    doc.setTextColor(...black)
    doc.text(`-${fmt(Number(invoice.discount_amount))}`, totalsRightX, y, { align: "right" })
  }

  // Total line with separator
  y += 3
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(totalsLeftX, y, totalsRightX, y)
  y += 6

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Total", totalsLeftX, y)
  doc.setTextColor(...black)
  doc.text(fmt(Number(invoice.total)), totalsRightX, y, { align: "right" })

  // Amount due - bold, with heavier separator
  y += 3
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  doc.line(totalsLeftX, y, totalsRightX, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text("Amount due", totalsLeftX, y)
  doc.text(`${fmt(Number(invoice.total))}${currencySuffix}`, totalsRightX, y, { align: "right" })

  // ============================================
  // FOOTER - Notes
  // ============================================
  if (invoice.notes) {
    y += 20
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...gray)
    const lines = doc.splitTextToSize(invoice.notes, contentWidth)
    doc.text(lines, marginLeft, y)
  }

  // Page number
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(180, 180, 180)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: "center" })
  }

  // Save
  doc.save(`${invoice.invoice_number}.pdf`)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}
