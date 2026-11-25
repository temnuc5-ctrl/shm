import type { CSSProperties } from "react";
import type { DocumentCategory } from "@/lib/documentCategories";

export const SHM_SAFI_LOGO_PATH = "/assets/logos/shm-safi.png";

const BURGUNDY = "#8B0000";
const LOGO_SIZE = 84;
const LOGO_COLUMN = 110;

const rule: CSSProperties = { height: 4, background: BURGUNDY };

// Les styles du document (th, td, table) s'appliquent à tous les tableaux :
// on les neutralise ici en ligne pour que l'en-tête reste une simple rangée.
const tableStyle: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  margin: "14px 0",
  direction: "ltr",
};

const cell: CSSProperties = {
  border: "none",
  padding: 0,
  background: "transparent",
  verticalAlign: "middle",
};

const logoImage: CSSProperties = {
  display: "inline-block",
  maxWidth: "100%",
  maxHeight: LOGO_SIZE,
  objectFit: "contain",
  verticalAlign: "middle",
};

const letterPlaceholder: CSSProperties = {
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  borderRadius: "50%",
  background: "#e5e7eb",
  color: "#374151",
  display: "inline-block",
  lineHeight: `${LOGO_SIZE}px`,
  textAlign: "center",
  fontSize: 38,
  fontWeight: 800,
};

interface DocumentHeaderProps {
  category: DocumentCategory | null;
  categoryLogoSrc: string | null;
  shmLogoSrc?: string | null;
  baseUrl?: string;
}

// Accepte un chemin (/assets/...) ou une data-URI (data:image/...).
const withBase = (src: string, baseUrl: string) =>
  src.startsWith("data:") || /^https?:/.test(src) ? src : `${baseUrl}${src}`;

export function DocumentHeader({ category, categoryLogoSrc, shmLogoSrc, baseUrl = "" }: DocumentHeaderProps) {
  return (
    <>
      <div style={rule} />
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: LOGO_COLUMN, textAlign: "left" }}>
              <img src={withBase(shmLogoSrc || SHM_SAFI_LOGO_PATH, baseUrl)} alt="SHM Safi" style={logoImage} />
            </td>
            <td style={{ ...cell, textAlign: "center", direction: "rtl", lineHeight: 1.8 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>بسم الله الرحمن الرحيم</p>
              <p style={{ margin: 0, fontWeight: 700 }}>الكشفية الحسنية المغربية</p>
            </td>
            <td style={{ ...cell, width: LOGO_COLUMN, textAlign: "right" }}>
              {category &&
                (categoryLogoSrc ? (
                  <img src={withBase(categoryLogoSrc, baseUrl)} alt={category.nom_fr} style={logoImage} />
                ) : (
                  <span style={letterPlaceholder}>{category.nom_fr.charAt(0).toUpperCase()}</span>
                ))}
            </td>
          </tr>
        </tbody>
      </table>
      <div style={rule} />
    </>
  );
}
