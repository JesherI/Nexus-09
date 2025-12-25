import { useTranslation } from "react-i18next";
import LanguageSelector from "../../components/LanguageSelector";
import NeuralParticles from "../../components/NeuralParticles";
import ThemeToggle from "../../components/ThemeToggle";

interface StartPageProps {
  onStart: () => void;
}

function StartPage({ onStart }: StartPageProps) {
  const { t } = useTranslation();

return (
    <main className="min-h-screen bg-primary text-primary flex flex-col items-center justify-center p-8 font-sans relative gradient-bg">
      {/* Neural Particles Background */}
      <NeuralParticles />
      
      {/* Background Decorative */}
      <div className="absolute top-0 h-full w-full" style={{ zIndex: 0 }}>
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
      </div>

 {/* Language Selector - Bottom Right (reusable component) */}
      <div className="absolute bottom-8 right-8 flex items-center gap-4" style={{ zIndex: 2 }}>
        <ThemeToggle variant="switch" />
        <LanguageSelector dropdownPosition="up" />
      </div>

{/* Center Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl" style={{ zIndex: 2 }}>
        <img src="/icon.png" alt="logo" className="logo-center mb-8 logo-enhanced" />

        <h1 className="text-6xl font-extrabold mb-4 text-enhanced text-center">
          {t('welcome.title')}
        </h1>

        <h2 className="text-3xl font-bold mb-12 accent-text text-center">
          {t('welcome.subtitle')}
        </h2>

        {/* Start Button with Arrow */}
        <button 
          onClick={onStart}
          className="glass px-8 py-4 rounded-full font-medium uppercase tracking-wide flex items-center gap-3 text-lg hover:scale-105 transition-all duration-300 hover:shadow-xl"
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