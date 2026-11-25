import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getDocumentCategory, type DocumentCategory } from "@/lib/documentCategories";

const STORAGE_KEY = "shm-document-category";

interface DocumentCategoryContextValue {
  category: DocumentCategory | null;
  selectCategory: (code: string) => void;
  clearCategory: () => void;
}

const DocumentCategoryContext = createContext<DocumentCategoryContextValue | undefined>(undefined);

const readStoredCategory = () => getDocumentCategory(sessionStorage.getItem(STORAGE_KEY));

export function DocumentCategoryProvider({ children }: { children: ReactNode }) {
  const [category, setCategoryState] = useState<DocumentCategory | null>(readStoredCategory);

  const selectCategory = useCallback((code: string) => {
    const next = getDocumentCategory(code);
    if (!next) return;
    sessionStorage.setItem(STORAGE_KEY, next.code);
    setCategoryState(next);
  }, []);

  const clearCategory = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setCategoryState(null);
  }, []);

  const value = useMemo(() => ({ category, selectCategory, clearCategory }), [category, selectCategory, clearCategory]);

  return <DocumentCategoryContext.Provider value={value}>{children}</DocumentCategoryContext.Provider>;
}

export function useDocumentCategory() {
  const context = useContext(DocumentCategoryContext);
  if (!context) throw new Error("useDocumentCategory doit être utilisé dans DocumentCategoryProvider.");
  return context;
}
