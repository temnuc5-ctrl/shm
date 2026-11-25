import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { downloadPdf } from "@/lib/pdfFile";
import { buildDocumentBlocks, renderPdf, type TemplateId } from "@/lib/documentRenderer";
import { createDocument } from "@/lib/documentsApi";
import { resolveDocumentHeader } from "@/lib/documentCategories";
import { useDocumentCategory } from "@/contexts/DocumentCategoryContext";
import DocumentCategoryPicker from "@/components/DocumentCategoryPicker";

const templates: { id: TemplateId; label: string; description: string; icon: string }[] = [
  { id: "hierarchy", label: "هيكلة دورية", description: "تحديد أدوار أفراد الدورية", icon: "🧭" },
  { id: "technical", label: "بطاقة تقنية", description: "تفاصيل نشاط أو خرجة", icon: "📋" },
  { id: "proposals", label: "مقترحات مرحلة", description: "برنامج الدورية للموسم", icon: "🗓️" },
  { id: "custom", label: "نموذج حر", description: "إنشاء مستند مخصص", icon: "📝" },
];

const MEMBER_ROLES = ["مراقب الزي", "أمين المال", "مسؤول التموين", "مسؤول الإعلام", "مسؤول النشاط"];

export default function DocumentGenerator() {
  const navigate = useNavigate();
  const { category, selectCategory, clearCategory } = useDocumentCategory();
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<string[][]>([["", ""]]);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const setRowValue = (rowIndex: number, cellIndex: number, value: string) => {
    setRows((current) => current.map((row, index) =>
      index === rowIndex ? row.map((cell, column) => column === cellIndex ? value : cell) : row,
    ));
  };

  const chooseTemplate = (id: TemplateId) => {
    setTemplate(id);
    setValues({});
    setRows(id === "hierarchy" ? [] : [["", "", ...(id === "proposals" ? [""] : [])]]);
  };

  const input = (key: string, label: string, placeholder = "") => (
    <label key={key} className="block space-y-2">
      <span className="block text-sm font-bold text-gray-600">{label}</span>
      <input
        value={values[key] || ""}
        placeholder={placeholder}
        onChange={(event) => setValue(key, event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium outline-none transition focus:border-primary focus:bg-white"
      />
    </label>
  );

  const textarea = (key: string, label: string, rowsCount = 3) => (
    <label key={key} className="block space-y-2">
      <span className="block text-sm font-bold text-gray-600">{label}</span>
      <textarea
        rows={rowsCount}
        value={values[key] || ""}
        onChange={(event) => setValue(key, event.target.value)}
        className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium outline-none transition focus:border-primary focus:bg-white"
      />
    </label>
  );

  const makeDocument = async () => {
    if (!template || !category) return;
    if ((template === "technical" || template === "proposals") && !values.authorName?.trim()) {
      setNotice("اسم المعدّ مطلوب");
      return;
    }

    setIsExporting(true);
    setNotice(null);
    try {
      const header = await resolveDocumentHeader(category);
      const { name, blocks } = buildDocumentBlocks(template, values, rows, header);
      const pdf = await renderPdf({ name, pages: [blocks] });
      // Le PDF est remis d'abord : la génération fonctionne même sans réseau.
      const downloadNotice = await downloadPdf(pdf);
      try {
        await createDocument({ template_type: template, name, content: { values, rows }, category_code: category.code, pdf });
        setNotice(downloadNotice);
      } catch {
        setNotice(`${downloadNotice} — لم يُحفظ في قائمة المستندات (لا يوجد اتصال).`);
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black shm-text-gradient md:text-4xl">إنشاء المستندات</h1>
            <p className="mt-3 text-sm font-medium text-gray-500">إنشاء وطباعة مستندات PDF الرسمية لفوج عمر الفاروق</p>
            {category && (
              <div className="mt-4 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.couleur }} />
                <span className="text-sm font-bold text-gray-700">الفئة: {category.nom_ar}</span>
                <button type="button" onClick={clearCategory} className="text-sm font-bold text-primary hover:underline">تغيير</button>
              </div>
            )}
          </div>
          {template ? (
            <button onClick={() => setTemplate(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">العودة إلى النماذج</button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/documents")} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">المستندات المحفوظة</button>
              <button onClick={() => navigate("/dashboard")} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">لوحة القيادة</button>
            </div>
          )}
        </div>

        {!category ? (
          <DocumentCategoryPicker onSelect={selectCategory} />
        ) : !template ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {templates.map((item) => (
              <button key={item.id} onClick={() => chooseTemplate(item.id)} className="shm-card group text-right hover:-translate-y-1">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl shm-gradient text-2xl text-white">{item.icon}</span>
                <span className="block text-xl font-black text-gray-800">{item.label}</span>
                <span className="mt-2 block text-sm font-medium text-gray-500">{item.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); makeDocument(); }} className="space-y-6">
            {template === "hierarchy" && (
              <>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">معلومات الدورية</h2>{input("patrolName", "اسم الدورية")}{input("memberCount", "عدد الأفراد")}{input("cry", "الصيحة")}</section>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">هيكلة الأفراد</h2>{input("leader", "الرائد")}{input("writer", "الكاتب")}{input("assistant", "المساعد")}{rows.map((row, rowIndex) => <div key={rowIndex} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"><select value={row[0]} onChange={(event) => setRowValue(rowIndex, 0, event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary"><option value="">اختر الدور</option>{MEMBER_ROLES.filter((role) => role === row[0] || !rows.some((other) => other[0] === role)).map((role) => <option key={role} value={role}>{role}</option>)}</select><input value={row[1]} placeholder="الاسم" onChange={(event) => setRowValue(rowIndex, 1, event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary" /><button type="button" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} className="rounded-xl border border-gray-200 px-3 font-bold text-gray-500">حذف</button></div>)}<button type="button" disabled={rows.length >= MEMBER_ROLES.length} onClick={() => setRows((current) => [...current, ["", ""]])} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50">+ إضافة فرد</button></section>
              </>
            )}
            {template === "technical" && (
              <>
                <section className="shm-card">{input("authorName", "اسم المعدّ *")}</section>
                <section className="shm-card grid gap-4 sm:grid-cols-2"><h2 className="sm:col-span-2 text-lg font-black text-gray-800">معلومات النشاط</h2>{input("activity", "النشاط")}{textarea("goal", "الهدف من النشاط", 2)}{input("slogan", "شعار النشاط")}{input("date", "التاريخ")}{input("place", "المكان")}{input("organizingCategory", "الفئة المنظمة")}{input("mediaContact", "المكلف بالإعلام")}{textarea("targetAudience", "الفئة المستهدفة", 2)}{textarea("needs", "الحاجيات", 2)}</section>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">برنامج النشاط (اختياري)</h2>{rows.map((row, rowIndex) => <div key={rowIndex} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">{row.map((cell, cellIndex) => <input key={cellIndex} value={cell} placeholder={cellIndex === 0 ? "التوقيت" : "الفقرة"} onChange={(event) => setRowValue(rowIndex, cellIndex, event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary" />)}<button type="button" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} className="rounded-xl border border-gray-200 px-3 font-bold text-gray-500">حذف</button></div>)}<button type="button" onClick={() => setRows((current) => [...current, ["", ""]])} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">+ إضافة فقرة</button></section>
              </>
            )}
            {template === "proposals" && (
              <>
                <section className="shm-card space-y-4">{input("authorName", "اسم المعدّ *")}{textarea("intro", "مقدمة (اختياري)", 3)}</section>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">البرنامج المقترح</h2>{rows.map((row, rowIndex) => <div key={rowIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">{row.map((cell, cellIndex) => <input key={cellIndex} value={cell} placeholder={["التاريخ", "الحصة", "التفاصيل"][cellIndex]} onChange={(event) => setRowValue(rowIndex, cellIndex, event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary" />)}<button type="button" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} className="rounded-xl border border-gray-200 px-3 font-bold text-gray-500">حذف</button></div>)}<button type="button" onClick={() => setRows((current) => [...current, ["", "", ""]])} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">+ إضافة حصة</button></section>
              </>
            )}
            {template === "custom" && (
              <>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">معلومات المستند</h2>{input("documentName", "اسم الملف")}{input("documentTitle", "العنوان الرئيسي")}{textarea("customText", "فقرة نصية", 4)}</section>
                <section className="shm-card space-y-4"><h2 className="text-lg font-black text-gray-800">جدول مخصص (اختياري)</h2><div className="grid gap-3 sm:grid-cols-2">{input("columnOne", "عنوان العمود الأول")}{input("columnTwo", "عنوان العمود الثاني")}</div>{rows.map((row, rowIndex) => <div key={rowIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">{row.map((cell, cellIndex) => <input key={cellIndex} value={cell} placeholder={`قيمة ${cellIndex + 1}`} onChange={(event) => setRowValue(rowIndex, cellIndex, event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary" />)}<button type="button" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} className="rounded-xl border border-gray-200 px-3 font-bold text-gray-500">حذف</button></div>)}<button type="button" onClick={() => setRows((current) => [...current, ["", ""]])} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">+ إضافة سطر</button></section>
              </>
            )}
            <button type="submit" disabled={isExporting} className="w-full rounded-2xl shm-gradient px-6 py-4 font-black text-white shadow-lg shadow-primary/20 disabled:opacity-60 sm:w-auto">{isExporting ? "جاري تجهيز PDF..." : "إنشاء PDF"}</button>
            {notice && <p className="text-sm font-bold text-emerald-700">{notice}</p>}
          </form>
        )}
      </div>
    </Layout>
  );
}
