export type ScheduleExportRow = {
  room: string;
  movie: string;
  start: string;
  format: string;
  language: string;
  bookedSeats: number;
  capacity: number;
};

const COLUMNS = ["Room", "Movie", "Start Time", "Format", "Language", "Booked", "Capacity"];

function rowToCells(r: ScheduleExportRow): (string | number)[] {
  return [r.room, r.movie, r.start, r.format, r.language, r.bookedSeats, r.capacity];
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportScheduleAsCsv(rows: ScheduleExportRow[], filenameBase: string) {
  const csv = [
    COLUMNS.join(","),
    ...rows.map((r) => rowToCells(r).map((c) => (typeof c === "string" && c.includes(",") ? `"${c}"` : c)).join(",")),
  ].join("\n");
  triggerBlobDownload(new Blob([csv], { type: "text/csv" }), `${filenameBase}.csv`);
}

export async function exportScheduleAsXlsx(rows: ScheduleExportRow[], filenameBase: string) {
  const XLSX = await import("xlsx");
  const sheetRows = rows.map((r) => ({
    Room: r.room,
    Movie: r.movie,
    "Start Time": r.start,
    Format: r.format,
    Language: r.language,
    Booked: r.bookedSeats,
    Capacity: r.capacity,
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
  XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
}

export async function exportScheduleAsPdf(rows: ScheduleExportRow[], filenameBase: string, title: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [COLUMNS],
    body: rows.map(rowToCells),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [194, 44, 201] },
  });
  doc.save(`${filenameBase}.pdf`);
}

export async function exportScheduleAsWord(rows: ScheduleExportRow[], filenameBase: string, title: string) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel } = await import("docx");

  const headerRow = new TableRow({
    children: COLUMNS.map(
      (c) =>
        new TableCell({
          width: { size: 100 / COLUMNS.length, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })],
        })
    ),
  });

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: rowToCells(r).map(
          (cell) =>
            new TableCell({
              width: { size: 100 / COLUMNS.length, type: WidthType.PERCENTAGE },
              children: [new Paragraph(String(cell))],
            })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
          new Table({ rows: [headerRow, ...bodyRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${filenameBase}.docx`);
}
