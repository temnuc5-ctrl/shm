import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DocumentHeader } from "@/components/DocumentHeader";
import type { DocumentHeaderData } from "@/lib/documentCategories";

export type TemplateId = "hierarchy" | "technical" | "proposals" | "custom";

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  hierarchy: "هيكلة دورية",
  technical: "بطاقة تقنية",
  proposals: "مقترحات مرحلة",
  custom: "نموذج حر",
};

export type PrintBlock =
  | { kind: "heading"; text: string; level: 1 | 2 }
  | { kind: "text"; text: string }
  | { kind: "keyvalue"; rows: [string, string][] }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | ({ kind: "header" } & DocumentHeaderData);

export interface PrintDocument {
  name: string;
  pages: PrintBlock[][];
}

export interface DocumentContent {
  values: Record<string, string>;
  rows: string[][];
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] || character);

function renderBlock(block: PrintBlock): string {
  if (block.kind === "header") {
    return renderToStaticMarkup(
      createElement(DocumentHeader, {
        category: block.category,
        categoryLogoSrc: block.categoryLogoSrc,
        baseUrl: window.location.origin,
      }),
    );
  }
  if (block.kind === "heading") {
    const tag = block.level === 1 ? "h2" : "h3";
    return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
  }
  if (block.kind === "text") return `<p>${escapeHtml(block.text)}</p>`;
  if (block.kind === "keyvalue") {
    return `<table class="keyvalue"><tbody>${block.rows
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join("")}</tbody></table>`;
  }
  return `<table><thead><tr>${block.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${block.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function buildHtml(documentData: PrintDocument) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(documentData.name)}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{width:794px;margin:0 auto;padding:38px 72px;color:#243024;font-family:Tahoma,Arial,sans-serif;font-size:14px}.sheet{min-height:1040px;page-break-after:always}.sheet:last-child{page-break-after:auto}h2{text-align:center;font-size:23px;margin:24px 0 12px}h3{font-size:16px;color:#624b2b;margin:20px 0 8px}p{line-height:1.9;white-space:pre-wrap;margin:10px 0}table{width:100%;border-collapse:collapse;margin:12px 0 18px}th,td{border:1px solid #d8c9a9;padding:10px 12px;text-align:right;vertical-align:top;line-height:1.7}th{background:#f5e6c8;color:#5f4a2b}.keyvalue th{width:34%}.footer{border-top:1px solid #e2e8f0;margin-top:30px;padding-top:12px;text-align:center;color:#8993a1;font-size:11px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><section class="sheet">${documentData.pages[0].map(renderBlock).join("")}<footer class="footer">تم إنشاء هذا المستند بواسطة نظام إدارة التقارير · ${new Date().toLocaleDateString("fr-FR")}</footer></section></body></html>`;
}

export async function renderPdf(documentData: PrintDocument): Promise<Blob> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;left:0;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none";
  const loaded = new Promise<void>((resolve) => {
    frame.onload = () => resolve();
  });
  frame.srcdoc = buildHtml(documentData);
  document.body.appendChild(frame);

  try {
    await loaded;
    const doc = frame.contentDocument;
    if (!doc) throw new Error("Impossible de préparer le document.");

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    let heightLeft = imgHeight - pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    frame.remove();
  }
}

export function buildDocumentBlocks(
  template: TemplateId,
  values: Record<string, string>,
  rows: string[][],
  header: DocumentHeaderData,
) {
  const value = (key: string) => values[key]?.trim() || "—";
  let name = "مستند فوج عمر الفاروق";
  let blocks: PrintBlock[] = [];

  if (template === "hierarchy") {
    name = `هيكلة دورية ${value("patrolName")}`;
    blocks = [
      { kind: "heading", text: "هيكلة دورية", level: 1 },
      { kind: "heading", text: "معلومات الدورية", level: 2 },
      { kind: "keyvalue", rows: [["اسم الدورية", value("patrolName")], ["عدد الأفراد", value("memberCount")], ["الصيحة", value("cry")]] },
      { kind: "heading", text: "هيكلة الأفراد", level: 2 },
      {
        kind: "table",
        columns: ["المهمة", "الاسم"],
        rows: [
          ["الرائد", value("leader")],
          ["الكاتب", value("writer")],
          ["المساعد", value("assistant")],
          ...rows.filter((row) => row[0]).map((row) => [row[0], row[1]?.trim() || "—"]),
        ],
      },
    ];
  } else if (template === "technical") {
    name = `بطاقة تقنية — ${value("activity")}`;
    blocks = [
      { kind: "heading", text: "بطاقة تقنية", level: 1 },
      { kind: "keyvalue", rows: [["معدّ البطاقة التقنية", value("authorName")]] },
      { kind: "heading", text: "معلومات النشاط", level: 2 },
      { kind: "keyvalue", rows: [["النشاط", value("activity")], ["الهدف من النشاط", value("goal")], ["شعار النشاط", value("slogan")], ["التاريخ", value("date")], ["المكان", value("place")], ["الفئة المنظمة", value("organizingCategory")], ["المكلف بالإعلام", value("mediaContact")], ["الفئة المستهدفة", value("targetAudience")],["الحاجيات", value("needs")]] },
      ...(rows.some((row) => row.some((cell) => cell.trim())) ? [{ kind: "heading", text: "برنامج النشاط", level: 2 } as PrintBlock, { kind: "table", columns: ["التوقيت", "الفقرة"], rows: rows.filter((row) => row.some((cell) => cell.trim())) } as PrintBlock] : []),
    ];
  } else if (template === "proposals") {
    name = `اقتراحات المرحلة — ${value("authorName")}`;
    blocks = [
      { kind: "heading", text: "اقتراحات المرحلة القادمة", level: 1 },
      { kind: "keyvalue", rows: [["معدّ الاقتراحات", value("authorName")]] },
      ...(values.intro?.trim() ? [{ kind: "text", text: values.intro.trim() } as PrintBlock] : []),
      { kind: "table", columns: ["التاريخ", "الحصة", "التفاصيل"], rows: rows.filter((row) => row.some((cell) => cell.trim())) },
    ];
  } else {
    name = value("documentName");
    blocks = [
      { kind: "heading", text: value("documentTitle"), level: 1 },
      ...(values.customText?.trim() ? [{ kind: "text", text: values.customText.trim() } as PrintBlock] : []),
      ...(rows.some((row) => row.some((cell) => cell.trim())) ? [{ kind: "table", columns: [value("columnOne"), value("columnTwo")], rows: rows.filter((row) => row.some((cell) => cell.trim())) } as PrintBlock] : []),
    ];
  }

  return { name, blocks: [{ kind: "header", ...header } as PrintBlock, ...blocks] };
}
