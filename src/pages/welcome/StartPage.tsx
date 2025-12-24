import { useTranslation } from "react-i18next";
import LanguageSelector from "../../components/LanguageSelector";

interface StartPageProps {
  onStart: () => void;
}

function StartPage({ onStart }: StartPageProps) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-8 font-sans relative">
      {/* Background Decorative */}
      <div className="absolute top-0 -z-10 h-full w-full bg-gradient-to-b from-[#2e1065] via-[#581c87] to-[#6b21a8]">
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-[rgba(147,51,234,0.2)] opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full bg-[rgba(167,139,250,0.15)] opacity-40 blur-[100px]"></div>
      </div>

{/* Language Selector - Bottom Right (reusable component) */}
      <div className="absolute bottom-8 right-8">
        <LanguageSelector dropdownPosition="up" />
      </div>

      {/* Center Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl">
        <img src="/icon.png" alt="logo" className="logo-center mb-8" />

        <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent text-center">
          {t('welcome.title')}
        </h1>

        <h2 className="text-3xl font-bold mb-12 text-purple-200 text-center">
          {t('welcome.subtitle')}
        </h2>

        {/* Start Button with Arrow */}
        <button 
          onClick={onStart}
          className="border border-white/30 backdrop-blur-sm px-8 py-4 rounded-full font-medium uppercase tracking-wide flex items-center gap-3 text-lg hover:bg-white/10 transition-all"
        >
          {t('start')}
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </main>
  );
}

export default StartPage;