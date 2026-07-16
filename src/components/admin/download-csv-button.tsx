"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function toCsvValue(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function DownloadCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  function handleDownload() {
    const csv = [headers.map(toCsvValue).join(","), ...rows.map((r) => r.map(toCsvValue).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
      <Download size={14} /> Download CSV
    </Button>
  );
}
