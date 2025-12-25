import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  className?: string;
  languages?: { code: string; label: string; flag?: string }[];
  dropdownPosition?: 'up' | 'down';
};

const DEFAULT_LANGS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' }
];

export default function LanguageSelector({ 
  className = '', 
  languages = DEFAULT_LANGS, 
  dropdownPosition = 'down' 
}: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => i18n.language || 'en');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelected(i18n.language || 'en');
  }, [i18n.language]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const current = languages.find((l) => l.code === selected) || languages[0];

  return (
    <div ref={ref} className={`relative text-left ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 transition-all min-w-[120px] justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{current.flag}</span>
          <span className="text-sm font-medium">{current.code.toUpperCase()}</span>
        </div>
        <svg className={`w-4 h-4 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

{open && (
        <div className={`absolute right-0 w-56 z-50 ${
          dropdownPosition === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          <div className="rounded-xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {languages.map((l) => {
                const active = l.code === selected;
                return (
                  <button
                    key={l.code}
                    onClick={() => handleSelect(l.code)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-all ${
                      active ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span className="truncate">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
