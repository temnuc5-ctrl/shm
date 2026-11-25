import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ListFiltersBar from "@/components/ListFiltersBar";
import { downloadPdf } from "@/lib/pdfFile";
import { buildDocumentBlocks, renderPdf, TEMPLATE_LABELS, type TemplateId } from "@/lib/documentRenderer";
import { deleteDocument, listDocuments, updateDocumentCategory, type SavedDocument } from "@/lib/documentsApi";
import { DOCUMENT_CATEGORIES, getDocumentCategory, resolveDocumentHeader } from "@/lib/documentCategories";
import { EMPTY_LIST_FILTERS, filterItems, type ListFilters } from "@/lib/listFilters";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function Documents() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListFilters>(EMPTY_LIST_FILTERS);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((error) => setNotice(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const visibleDocs = useMemo(() => filterItems(docs, filters, (doc) => doc.name), [docs, filters]);

  const handleDelete = async (doc: SavedDocument) => {
    if (!window.confirm(`حذف المستند «${doc.name}» نهائيًا؟`)) return;
    setDeleting(doc.id);
    setNotice(null);
    try {
      await deleteDocument(doc.id);
      setDocs((previous) => previous.filter((item) => item.id !== doc.id));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setDeleting(null);
    }
  };

  const handleRegenerate = async (doc: SavedDocument) => {
    setExporting(doc.id);
    setNotice(null);
    try {
      const header = await resolveDocumentHeader(getDocumentCategory(doc.category_code));
      const { blocks } = buildDocumentBlocks(doc.template_type, doc.content.values, doc.content.rows, header);
      setNotice(await downloadPdf(await renderPdf({ name: doc.name, pages: [blocks] })));
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      setNotice(errorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const handleAssignCategory = async (doc: SavedDocument, categoryCode: string) => {
    setAssigning(doc.id);
    setNotice(null);
    try {
      const updated = await updateDocumentCategory(doc.id, categoryCode);
      setDocs((previous) => previous.map((item) => (item.id === doc.id ? updated : item)));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black shm-text-gradient md:text-4xl">المستندات</h1>
            <p className="mt-3 text-sm font-medium text-gray-500">المستندات المحفوظة</p>
          </div>
          <button onClick={() => navigate("/documents/new")} className="rounded-xl shm-gradient px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20">
            + إنشاء مستند
          </button>
        </div>

        {notice && <p className="text-sm font-bold text-emerald-700">{notice}</p>}

        {loading ? (
          <p className="text-center text-gray-400 font-bold">جاري التحميل...</p>
        ) : docs.length === 0 ? (
          <p className="text-center text-gray-400 font-bold">لا توجد مستندات محفوظة.</p>
        ) : (
          <>
            <ListFiltersBar value={filters} onChange={setFilters} />

            {visibleDocs.length === 0 ? (
              <p className="text-center text-gray-400 font-bold">لا توجد نتائج مطابقة للبحث أو الفلاتر.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleDocs.map((doc) => {
                  const category = getDocumentCategory(doc.category_code);
                  return (
                    <div key={doc.id} className="shm-card space-y-3">
                      <div>
                        <p className="font-black text-gray-800">{doc.name}</p>
                        <p className="mt-1 text-xs font-medium text-gray-400">
                          {TEMPLATE_LABELS[doc.template_type as TemplateId] ?? doc.template_type} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                        </p>
                        {category ? (
                          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-600">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.couleur }} />
                            {category.nom_ar}
                          </p>
                        ) : (
                          <select
                            value=""
                            disabled={assigning === doc.id}
                            onChange={(event) => handleAssignCategory(doc, event.target.value)}
                            className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 outline-none"
                          >
                            <option value="">بدون فئة — اختر الفئة</option>
                            {DOCUMENT_CATEGORIES.map((item) => (
                              <option key={item.code} value={item.code}>{item.nom_ar}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleRegenerate(doc)}
                          disabled={exporting === doc.id}
                          className="flex-1 rounded-xl shm-gradient py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          {exporting === doc.id ? "جاري التجهيز..." : "تحميل PDF"}
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
