import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ListFiltersBar from "@/components/ListFiltersBar";
import { API_BASE, getAuthHeaders } from "@/lib/auth";
import { getDocumentCategory } from "@/lib/documentCategories";
import { EMPTY_LIST_FILTERS, filterItems, type ListFilters } from "@/lib/listFilters";

interface Report {
  id: string;
  title: string;
  location: string;
  time: string;
  pdf_url?: string;
  category_code: string | null;
  created_at: string;
}

/**
 * Cache local de la LISTE uniquement (titre, lieu, date, lien PDF).
 * Volontairement sans le corps du rapport : le catalogue reste léger et
 * consultable au camp, hors réseau, sans télécharger les documents.
 */
const DOCS_CACHE_KEY = "shm_rapport_docs_cache_v1";

interface DocsCache {
  savedAt: string;
  reports: Report[];
}

function readCache(): DocsCache | null {
  try {
    const raw = localStorage.getItem(DOCS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocsCache;
    if (!Array.isArray(parsed.reports)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(reports: Report[]): void {
  try {
    const payload: DocsCache = { savedAt: new Date().toISOString(), reports };
    localStorage.setItem(DOCS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota dépassé : le cache est un confort, jamais un blocage.
  }
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ savedAt: string } | null>(null);
  const [filters, setFilters] = useState<ListFilters>(EMPTY_LIST_FILTERS);
  const visibleReports = useMemo(() => filterItems(reports, filters, (report) => report.title), [reports, filters]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setDebugError(null);
      try {
        const response = await fetch(`${API_BASE}/api/report-catalog`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || `Erreur de chargement des documents (${response.status}).`);
        }

        const data = (await response.json()) as { reports: Report[] };
        const freshReports = data.reports || [];
        setReports(freshReports);
        setCacheInfo(null);
        writeCache(freshReports);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        const cached = readCache();
        if (cached) {
          setReports(cached.reports);
          setCacheInfo({ savedAt: cached.savedAt });
          setDebugError(null);
        } else {
          const message = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
          setDebugError((prev) => prev || `Exception: ${message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <div className="mb-12 animate-in fade-in duration-700">
        <h1 className="text-4xl font-black shm-text-gradient mb-4 uppercase tracking-wider">
سجل التقارير
        </h1>
        <div className="w-20 h-1.5 shm-gradient rounded-full"></div>
      </div>

      {cacheInfo && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-right" dir="rtl">
          <span className="text-xl">📥</span>
          <p className="text-sm font-bold text-amber-800">
            وضع غير متصل — تُعرض القائمة المحفوظة على هذا الجهاز
            <span className="block text-[11px] font-medium text-amber-600">
              آخر تحديث: {new Date(cacheInfo.savedAt).toLocaleString("ar-MA")} · معلومات عامة فقط، بدون محتوى التقارير
            </span>
          </p>
        </div>
      )}

      {!loading && !debugError && reports.length > 0 && (
        <div className="mb-8">
          <ListFiltersBar value={filters} onChange={setFilters} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-primary"></div>
        </div>
      ) : debugError ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-right" dir="ltr">
          <p className="font-black text-red-700 mb-2">DEBUG ERROR:</p>
          <p className="text-xs text-red-600 break-all font-mono">{debugError}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-700">
          {visibleReports.length > 0 ? (
              visibleReports.map((report) => (
                <div key={report.id} className="shm-card group">
                  <div className="w-12 h-12 shm-gradient text-white rounded-xl flex items-center justify-center mb-6 shadow-md shadow-primary/10 group-hover:scale-110 transition-transform">
                    <span className="text-xl">📄</span>
                  </div>
                  <h3 className="font-black text-xl mb-3 text-gray-800 uppercase tracking-tight line-clamp-2 min-h-[3.5rem]">
                    {report.title}
                  </h3>
                  <div className="text-sm text-gray-400 font-bold space-y-2 mb-6 border-t border-gray-50 pt-4">
                    <p className="flex items-center gap-2">🏷️ {getDocumentCategory(report.category_code)?.nom_ar ?? "بدون فئة"}</p>
                    <p className="flex items-center gap-2">📍 {report.location}</p>
                    <p className="flex items-center gap-2">🕒 {report.time}</p>
                    <p className="flex items-center gap-2">📅 {new Date(report.created_at).toLocaleDateString("ar-MA")}</p>
                  </div>
                  {report.pdf_url ? (
                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full shm-gradient text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest shm-gradient-hover shadow-lg shadow-primary/10"
                    >
                      عرض ملف PDF
                    </a>
                  ) : (
                    <div className="flex items-center justify-center w-full rounded-xl bg-gray-100 px-6 py-4 text-xs font-black text-gray-400">
                      PDF غير متوفر بعد
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-24 bg-white border-2 border-dashed border-gray-100 rounded-[3rem]">
                <p className="text-gray-300 font-black uppercase tracking-[0.2em]">{reports.length > 0 ? "لا توجد نتائج مطابقة للبحث أو الفلاتر" : "لا توجد تقارير متاحة حالياً"}</p>
              </div>
          )}
        </div>
      )}
    </Layout>
  );
}
