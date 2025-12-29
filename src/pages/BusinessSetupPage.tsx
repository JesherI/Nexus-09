import { useState } from "react";
import { useTranslation } from "react-i18next";
import NeuralParticles from "../components/NeuralParticles";
import { FirebaseServices } from "../services/firebaseServices";

interface BusinessSetupPageProps {
  onBusinessSetup: (businessId: string) => void;
  onBack: () => void;
}

function BusinessSetupPage({ onBusinessSetup, onBack }: BusinessSetupPageProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    website: '',
    email: '',
    phone: '',
    logo: null as File | null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isFormValid = formData.name.trim() && formData.location.trim() && formData.phone.trim();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let logoBase64: string | undefined;
      if (formData.logo) {
        const reader = new FileReader();
        logoBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(formData.logo!);
        });
      }

       const businessData = {
         name: formData.name,
         location: formData.location,
         website: formData.website || undefined,
         email: formData.email || undefined,
         phone: formData.phone,
         logo: logoBase64,
         createdAt: new Date(),
       };

       const { id: businessId, isExisting } = await FirebaseServices.registerBusiness(businessData);
       if (isExisting) {
         setMessage(t('business.businessAlreadyExists'));
       } else {
         setMessage(t('business.businessRegistered'));
       }
       onBusinessSetup(businessId);
    } catch (error) {
      console.error('Error creating business:', error);
      // Handle error, maybe show message
    } finally {
      setLoading(false);
    }
  };

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
            {t('businessSetup.title')}
          </h1>
        </div>

         {/* Form Container */}
         <div className="glass-card rounded-2xl p-8">
          {/* Message */}
          {message && (
            <div className="mb-6 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-secondary text-sm">
              {message}
            </div>
          )}

          {/* Logo Upload */}
           <div className="flex justify-center mb-6">
             <div className="relative">
               <div className="w-24 h-24 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                 {logoPreview ? (
                   <img src={logoPreview} alt={t('business.logoLabel')} className="w-full h-full object-cover" />
                 ) : (
                   <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                 )}
               </div>
               <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors">
                 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleLogoChange}
                   className="hidden"
                 />
               </label>
             </div>
           </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('business.nombreNegocio')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                 className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('business.ingreseNombreNegocio')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('business.ubicacion')}</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                 className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('business.ingreseUbicacion')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('business.paginaWeb')}</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                 className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('business.paginaWebPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('business.correoElectronico')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                 className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('business.correoPlaceholder')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-secondary">{t('business.numeroTelefono')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                 className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('business.ingreseNumeroTelefono')}
              />
            </div>

            <div className="md:col-span-2 flex justify-center">
               <button
                 type="submit"
                 disabled={loading || !isFormValid}
                  className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:from-[var(--accent-light)] hover:to-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
               >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('business.guardando')}
                  </>
                ) : t('business.continuar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default BusinessSetupPage;