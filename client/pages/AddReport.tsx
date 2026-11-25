import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import DocumentCategoryPicker from "@/components/DocumentCategoryPicker";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { offlineStorage } from "@/lib/storage/offlineStorage";
import { syncManager } from "@/lib/sync/syncManager";
import { useDocumentCategory } from "@/contexts/DocumentCategoryContext";

const CATEGORIES = [
  { id: "ashbal_zahrat", label: "براعم و أشبال و زهرات" },
  { id: "kashafa_mourshidat", label: "كشافة و مرشدات" },
  { id: "kashaf_moutaqadim_raidat", label: "كشاف متقدم و رائدات" },
  { id: "jawala_dalilat", label: "الجوالة و الدليلات" },
];

export default function AddReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { category, selectCategory, clearCategory } = useDocumentCategory();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    time: "",
    objective: "",
    boysCount: 0,
    girlsCount: 0,
    leadersCount: 0,
    description: "",
    evaluationPositive: "",
    evaluationNegative: "",
    recommendations: "",
  });

  const [selectedOrganizingCategories, setSelectedOrganizingCategories] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOrganizingCategoryToggle = (categoryId: string) => {
    setSelectedOrganizingCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى اختيار الفئة المستهدفة.",
      });
      return;
    }
    if (selectedOrganizingCategories.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى اختيار فئة منظمة واحدة على الأقل.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const organizingCategoryLabels = selectedOrganizingCategories
        .map((id) => CATEGORIES.find((cat) => cat.id === id)?.label)
        .filter(Boolean)
        .join(" - ");

      const localId = crypto.randomUUID();
      const reportData = {
        localId,
        title: formData.title.trim(),
        location: formData.location,
        date: formData.date,
        time: formData.time,
        objective: formData.objective,
        participants_boys: Number(formData.boysCount),
        participants_girls: Number(formData.girlsCount),
        leaders_count: Number(formData.leadersCount),
        category: organizingCategoryLabels,
        beneficiary: category.nom_ar,
        category_code: category.code,
        description_original: formData.description,
        description_reformulated: formData.description,
        evaluation_positive: formData.evaluationPositive,
        evaluation_negative: formData.evaluationNegative,
        recommendations: formData.recommendations,
      };

      await offlineStorage.saveReport({
        localId,
        title: reportData.title,
        content: JSON.stringify(reportData),
        date: formData.date,
        syncStatus: "pending",
      });

      syncManager.syncAll().catch((err) =>
        console.warn("Sync immédiate impossible, réessai automatique plus tard:", err)
      );

      toast({
        title: "تم بنجاح",
        description: "تم حفظ التقرير بنجاح.",
      });
      navigate("/report-success", {
        state: {
          report: {
            ...reportData,
            description: formData.description,
            evaluationPositive: formData.evaluationPositive,
            evaluationNegative: formData.evaluationNegative,
          },
          title: formData.title,
        },
      });
    } catch (error: any) {
      console.error("Report save error:", error);
      const message = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "خطأ",
        description: message === "Failed to fetch"
          ? "تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase والاتصال بالشبكة."
          : message || "حدث خطأ أثناء إرسال التقرير.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-12 duration-700">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-gray-100 p-10 md:p-14">
          <div className="text-center mb-14">
             <div className="w-20 h-20 shm-gradient text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
              <span className="text-4xl">📄</span>
            </div>
            <h2 className="text-4xl font-black shm-text-gradient mb-4 uppercase tracking-wider">
              إضافة تقرير SHM (نموذج A4)
            </h2>
            <div className="w-16 h-1.5 shm-gradient mx-auto rounded-full"></div>
          </div>

          {!category ? (
            <DocumentCategoryPicker onSelect={selectCategory} />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.couleur }} />
              <span className="text-sm font-bold text-gray-700">الفئة المستهدفة: {category.nom_ar}</span>
              <button type="button" onClick={clearCategory} className="text-sm font-bold text-primary hover:underline">تغيير</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">عنوان التقرير</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">المكان</label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">التاريخ</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">الوقت</label>
                <input
                  type="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">عدد القادة</label>
                <input
                  type="number"
                  name="leadersCount"
                  min={0}
                  required
                  value={formData.leadersCount}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">الفئة المنظمة</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleOrganizingCategoryToggle(cat.id)}
                    className={cn(
                      "px-4 py-4 rounded-2xl text-[10px] font-black transition-all border-2",
                      selectedOrganizingCategories.includes(cat.id)
                        ? "shm-gradient text-white border-transparent shadow-lg shadow-primary/20"
                        : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-6 w-full md:col-span-2">
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">عدد الذكور</label>
                  <input
                    type="number"
                    name="boysCount"
                    min={0}
                    value={formData.boysCount}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-center"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">عدد الإناث</label>
                  <input
                    type="number"
                    name="girlsCount"
                    min={0}
                    value={formData.girlsCount}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">الهدف / السياق</label>
              <textarea
                name="objective"
                required
                rows={2}
                value={formData.objective}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">الوصف التفصيلي</label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-black text-green-600 uppercase tracking-widest mr-1">التقييم (نقط إيجابية)</label>
                <textarea
                  name="evaluationPositive"
                  rows={3}
                  value={formData.evaluationPositive}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-green-50/30 border-2 border-transparent focus:bg-white focus:border-green-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/5 transition-all font-bold resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-red-600 uppercase tracking-widest mr-1">التقييم (نقط سلبية)</label>
                <textarea
                  name="evaluationNegative"
                  rows={3}
                  value={formData.evaluationNegative}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-red-50/30 border-2 border-transparent focus:bg-white focus:border-red-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/5 transition-all font-bold resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mr-1">التوصيات</label>
              <textarea
                name="recommendations"
                rows={3}
                value={formData.recommendations}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold resize-none"
              />
            </div>

            <div className="flex justify-center pt-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full max-w-sm shm-gradient text-white font-black py-5 rounded-2xl transition-all shm-gradient-hover shadow-xl shadow-primary/20 uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    جاري الإرسال...
                  </>
                ) : "إرسال التقرير"}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
