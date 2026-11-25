export interface DocumentCategory {
  code: string;
  nom_ar: string;
  nom_fr: string;
  couleur: string;
  logo_url: string;
  slogan: string;
}

export interface DocumentHeaderData {
  category: DocumentCategory | null;
  categoryLogoSrc: string | null;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { code: "baraim-ashbal-zahrat", nom_ar: "براعم وأشبال وزهرات", nom_fr: "Baraim, Ashbal & Zahrat", couleur: "#7DD3FC", logo_url: "/assets/logos/achbal.png", slogan: "أقصى جهدنا" },
  { code: "kachchaf-murchidat", nom_ar: "الكشاف والمرشدات", nom_fr: "Kachchaf & Murchidat", couleur: "#059669", logo_url: "/assets/logos/kachafa.png", slogan: "دائما مستعد" },
  { code: "mutaqaddim-raidat", nom_ar: "كشاف متقدم ومرشدات متقدمات", nom_fr: "Kachchaf Mutaqaddim & Raïdat", couleur: "#DC2626", logo_url: "/assets/logos/motakadim.png", slogan: "خدمة الصالح العام" },
  { code: "jawwala-dalilat", nom_ar: "الجوالة والدليلات", nom_fr: "Jawwala & Dalilat", couleur: "#FDE68A", logo_url: "/assets/logos/jowala.png", slogan: "تنمية المجتمع" },
];

const LEGACY_CODES: Record<string, string> = {
  baraim: "baraim-ashbal-zahrat", ashbal: "baraim-ashbal-zahrat", zahrat: "baraim-ashbal-zahrat",
  kachchaf: "kachchaf-murchidat", murchidat: "kachchaf-murchidat",
  "kachchaf-mutaqaddim": "mutaqaddim-raidat", raidat: "mutaqaddim-raidat",
  jawwala: "jawwala-dalilat", dalilat: "jawwala-dalilat",
};
export const normalizeCategoryCode = (code: string | null | undefined) =>
  code ? (LEGACY_CODES[code] ?? code) : null;
export const getDocumentCategory = (code: string | null | undefined) => {
  const n = normalizeCategoryCode(code);
  return DOCUMENT_CATEGORIES.find((c) => c.code === n) ?? null;
};

export function resolveLogoUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(url);
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}

export async function resolveDocumentHeader(category: DocumentCategory | null): Promise<DocumentHeaderData> {
  return { category, categoryLogoSrc: category ? await resolveLogoUrl(category.logo_url) : null };
}
