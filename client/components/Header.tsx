import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { isSessionValid } from "@/lib/auth";

interface HeaderProps {
  /** Ouvre le menu latéral. Optionnel : les pages publiques (connexion,
   *  inscription) n'ont pas de menu. */
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const isLoggedIn = isSessionValid();

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 relative overflow-hidden rounded-full border-2 border-primary/10 p-1 group-hover:scale-110 transition-transform duration-300">
            <img
              src="/shm-logo.png"
              alt="Logo SHM"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg md:text-xl shm-text-gradient uppercase tracking-tight">
              الكشافة الحسنية المغربية
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] -mt-1">
              Scoutisme Hassania Marocain
            </span>
          </div>
        </Link>

        {isLoggedIn ? (
          <button
            onClick={onMenuClick}
            className="p-3 rounded-full text-gray-500 border border-gray-200 hover:border-primary/30 hover:text-primary transition-all"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>
        ) : (
          <Link
            to="/login"
            className="px-6 py-2 text-sm font-bold text-white shm-gradient rounded-full shadow-sm hover:shadow-md transition-all shm-gradient-hover"
          >
            تسجيل الدخول
          </Link>
        )}
      </div>
    </header>
  );
}
