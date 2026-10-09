import XLSX from "xlsx"
import PDFDocument from "pdfkit"
import { Readable } from "node:stream"

export interface ExportStudentRow {
  id: string | number
  name: string
  level: string
  school: string
  branch: string
  halaqa: string
  sheikh: string
  enrollmentDate: string
  phone?: string
  gender?: string
}

export function generateExcelBuffer(
  sheetName: string,
  headers: string[],
  rows: any[][],
): Buffer {
  const wb = XLSX.utils.book_new()
  const data = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Configure column widths
  ws["!cols"] = headers.map(() => ({ wch: 22 }))

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return Buffer.from(buf)
}

export function generateCsvBuffer(headers: string[], rows: any[][]): Buffer {
  const lines = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ]
  // Add UTF-8 BOM so Excel and Arabic readers parse Arabic characters properly
  const bom = "\uFEFF"
  return Buffer.from(bom + lines.join("\r\n"), "utf-8")
}

export function generatePdfBuffer(
  title: string,
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    })

    const buffers: Buffer[] = []
    doc.on("data", (chunk) => buffers.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(buffers)))
    doc.on("error", reject)

    // Document header
    doc.fontSize(18).text(title, { align: "center" })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor("#666666").text(
      `تاريخ الإصدار: ${new Date().toLocaleDateString("fr-CA")}`,
      { align: "center" },
    )
    doc.moveDown(1.5)

    // Render table rows
    doc.fillColor("#000000").fontSize(10)

    const tableTop = doc.y
    const colCount = headers.length
    const colWidth = (doc.page.width - 80) / colCount

    // Header background
    doc.rect(40, tableTop, doc.page.width - 80, 24).fill("#f1f5f9")
    doc.fillColor("#0f172a").fontSize(10)

    headers.forEach((h, i) => {
      doc.text(h, 40 + i * colWidth + 5, tableTop + 6, {
        width: colWidth - 10,
        align: "right",
      })
    })

    let curY = tableTop + 26
    doc.fontSize(9).fillColor("#334155")

    rows.forEach((r, idx) => {
      // Check page overflow
      if (curY > doc.page.height - 50) {
        doc.addPage()
        curY = 40
      }

      const isEven = idx % 2 === 0
      if (isEven) {
        doc.rect(40, curY, doc.page.width - 80, 20).fill("#f8fafc")
      }
      doc.fillColor("#1e293b")

      r.forEach((cell, i) => {
        doc.text(String(cell ?? ""), 40 + i * colWidth + 5, curY + 4, {
          width: colWidth - 10,
          align: "right",
        })
      })

      curY += 20
    })

    doc.end()
  })
}
