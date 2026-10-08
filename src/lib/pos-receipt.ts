"use client";

import { jsPDF } from "jspdf";

export type ReceiptLine = { label: string; quantity: number; price: number; subContent?: string };

export type ReceiptData = {
  reference: string;
  branchName: string;
  staffName: string;
  paymentMethod: "CASH" | "CARD";
  ticketLines: ReceiptLine[];
  itemLines: ReceiptLine[];
  total: number;
};

const PAGE_WIDTH = 80; // mm — standard thermal receipt roll width
const LOGO_NATURAL_RATIO = 229 / 441; // logo-mark.png's own height/width

// jsPDF's built-in fonts don't include the ₦ glyph (it renders as a blank box), so
// receipts use the ISO code instead of formatNaira()'s narrow ₦ symbol.
function formatAmount(n: number): string {
  return `NGN ${Math.round(n).toLocaleString("en-NG")}`;
}

/** Fetches the site logo and inlines it as a data URL so jsPDF can embed it — returns null (caller falls back to a text header) if it can't be loaded. */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo-mark.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Builds an 80mm receipt PDF for the just-completed sale and opens it print-ready in a new tab. */
export async function printPosReceipt(data: ReceiptData) {
  const logo = await loadLogoDataUrl();

  const allLines = [...data.ticketLines, ...data.itemLines];
  const subContentLines = allLines.filter((l) => l.subContent).length;
  const height = 95 + allLines.length * 9 + subContentLines * 4;
  const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, height] });

  const marginX = 5;
  const rightX = PAGE_WIDTH - marginX;
  let y = 9;

  if (logo) {
    const logoWidth = 42;
    const logoHeight = logoWidth * LOGO_NATURAL_RATIO;
    doc.addImage(logo, "PNG", (PAGE_WIDTH - logoWidth) / 2, y, logoWidth, logoHeight);
    y += logoHeight + 4;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("OJAJA CINEMAS", PAGE_WIDTH / 2, y, { align: "center" });
    y += 5.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.branchName, PAGE_WIDTH / 2, y, { align: "center" });
  y += 6;

  doc.setDrawColor(170);
  doc.line(marginX, y, rightX, y);
  y += 5;

  doc.setFontSize(8.5);
  const rows: [string, string][] = [
    ["Ref", data.reference],
    ["Date", new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })],
    ["Cashier", data.staffName],
    ["Payment", data.paymentMethod],
  ];
  for (const [label, value] of rows) {
    doc.text(`${label}:`, marginX, y);
    doc.text(value, rightX, y, { align: "right" });
    y += 4.5;
  }
  y += 1.5;

  doc.line(marginX, y, rightX, y);
  y += 5;

  for (const l of allLines) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(l.label, marginX, y, { maxWidth: (rightX - marginX) * 0.6 });
    doc.text(formatAmount(l.price * l.quantity), rightX, y, { align: "right" });
    y += 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${l.quantity} x ${formatAmount(l.price)}`, marginX, y);
    y += 5;
    if (l.subContent) {
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(l.subContent, marginX, y, { maxWidth: rightX - marginX });
      doc.setTextColor(0);
      y += 4;
    }
  }

  doc.line(marginX, y, rightX, y);
  y += 6.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", marginX, y);
  doc.text(formatAmount(data.total), rightX, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Thank you for visiting OJAJA Cinemas!", PAGE_WIDTH / 2, y, { align: "center" });

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
