import { useState } from "react";
import { useTranslation } from "react-i18next";
import NeuralParticles from "../components/NeuralParticles";
import { db, PosSettings } from "../database";

interface PosSetupPageProps {
  businessId: number;
  onPosSetup: () => void;
  onBack: () => void;
}

function PosSetupPage({ businessId, onPosSetup, onBack }: PosSetupPageProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    timezone: '',
    dateFormat: '',
    currency: '',
  });
  const [loading, setLoading] = useState(false);

  // Timezone options
  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET) - UTC-5' },
    { value: 'America/Chicago', label: 'Central Time (CT) - UTC-6' },
    { value: 'America/Denver', label: 'Mountain Time (MT) - UTC-7' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - UTC-8' },
    { value: 'America/Mexico_City', label: 'Mexico City - UTC-6' },
    { value: 'Europe/London', label: 'London - UTC+0' },
    { value: 'Europe/Paris', label: 'Paris - UTC+1' },
    { value: 'Europe/Berlin', label: 'Berlin - UTC+1' },
    { value: 'Asia/Tokyo', label: 'Tokyo - UTC+9' },
    { value: 'Asia/Shanghai', label: 'Shanghai - UTC+8' },
    { value: 'Australia/Sydney', label: 'Sydney - UTC+10' },
  ];

  // Date format options
  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (European)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
    { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: 'USD - Dólar estadounidense' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'MXN', label: 'MXN - Peso mexicano' },
    { value: 'COP', label: 'COP - Peso colombiano' },
    { value: 'PEN', label: 'PEN - Sol peruano' },
    { value: 'GTQ', label: 'GTQ - Quetzal guatemalteco' },
    { value: 'CRC', label: 'CRC - Colón costarricense' },
    { value: 'PAB', label: 'PAB - Balboa panameño' },
    { value: 'SVC', label: 'SVC - Colón salvadoreño' },
    { value: 'NIO', label: 'NIO - Córdoba nicaragüense' },
    { value: 'HNL', label: 'HNL - Lempira hondureña' },
    { value: 'BZD', label: 'BZD - Dólar beliceño' },
    { value: 'GBP', label: 'GBP - Libra esterlina' },
    { value: 'JPY', label: 'JPY - Yen japonés' },
    { value: 'CAD', label: 'CAD - Dólar canadiense' },
    { value: 'AUD', label: 'AUD - Dólar australiano' },
    { value: 'CHF', label: 'CHF - Franco suizo' },
    { value: 'CNY', label: 'CNY - Yuan chino' },
    { value: 'BRL', label: 'BRL - Real brasileño' },
    { value: 'ARS', label: 'ARS - Peso argentino' },
    { value: 'CLP', label: 'CLP - Peso chileno' },
    { value: 'UYU', label: 'UYU - Peso uruguayo' },
    { value: 'PYG', label: 'PYG - Guaraní paraguayo' },
    { value: 'BOB', label: 'BOB - Boliviano' },
    { value: 'VES', label: 'VES - Bolívar venezolano' },
    { value: 'DOP', label: 'DOP - Peso dominicano' },
    { value: 'HTG', label: 'HTG - Gourde haitiano' },
    { value: 'JMD', label: 'JMD - Dólar jamaiquino' },
    { value: 'TTD', label: 'TTD - Dólar trinitense' },
    { value: 'XCD', label: 'XCD - Dólar del Caribe Oriental' },
    { value: 'BSD', label: 'BSD - Dólar bahameño' },
    { value: 'KYD', label: 'KYD - Dólar caimán' },
    { value: 'ANG', label: 'ANG - Florín antillano' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const posSettings: PosSettings = {
        businessId,
        timezone: formData.timezone,
        dateFormat: formData.dateFormat,
        currency: formData.currency,
        createdAt: new Date(),
      };

      await db.posSettings.add(posSettings);
      onPosSetup();
    } catch (error) {
      console.error('Error saving POS settings:', error);
      // Handle error, maybe show message
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.timezone && formData.dateFormat && formData.currency;

  return (
    <main className="min-h-screen bg-primary text-primary flex flex-col items-center justify-center p-4 font-sans relative">
      {/* Back Button - Top Left */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 z-50 p-2 glass rounded-full hover:scale-110 transition-all duration-300 shadow-lg"
        aria-label={t('business.goBack')}
      >
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {/* Neural Particles Background */}
      <NeuralParticles />

       {/* Background Decorative */}
       <div className="absolute top-0 h-full w-full gradient-bg" style={{ zIndex: 0 }}>
         <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
         <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
       </div>



      {/* Center Content */}
      <div className="w-full max-w-2xl" style={{ zIndex: 2 }}>
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-12">
          <img src="/icon.png" alt={t('business.logo')} className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent text-center">
            {t('posSetup.title')}
          </h1>
        </div>

         {/* Form Container */}
         <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('posSetup.zonaHoraria')}</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                required
              >
                <option value="">{t('posSetup.seleccioneZonaHoraria')}</option>
                {timezoneOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-neutral-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Format */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('posSetup.formatoFecha')}</label>
              <select
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleInputChange}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                required
              >
                <option value="">{t('posSetup.seleccioneFormatoFecha')}</option>
                {dateFormatOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-neutral-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('posSetup.tipoMoneda')}</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                required
              >
                <option value="">{t('posSetup.seleccioneTipoMoneda')}</option>
                {currencyOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-neutral-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:from-[var(--accent-light)] hover:to-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('posSetup.guardando')}
                  </>
                ) : t('posSetup.continuar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default PosSetupPage;