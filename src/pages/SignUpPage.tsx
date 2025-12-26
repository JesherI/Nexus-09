import { useState, useEffect } from 'react';
import { UserType } from '../database';
import { AuthService } from '../services/auth';
import { db } from '../database';
import NeuralParticles from '../components/NeuralParticles';
import { useTranslation } from 'react-i18next';

interface SignUpPageProps {
  onSignUp: (userData: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
    type?: UserType;
    currentUserRole?: UserType;
  }) => Promise<void>;
  onBack: () => void;
  currentUserRole?: UserType;
}

function SignUpPage({ onSignUp, onBack, currentUserRole }: SignUpPageProps) {
  const t = useTranslation().t;
  const [formData, setFormData] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    type: currentUserRole === 'admin' ? 'cashier' as UserType : 'admin' as UserType
  });
  const [profileImage, setProfileImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const isFormValid = formData.nombre.trim() && formData.apellidoPaterno.trim() && formData.apellidoMaterno.trim() &&
                     formData.phone.trim() && formData.email.trim() && formData.password.trim() && formData.confirmPassword.trim();

  useEffect(() => {
    const checkFirstTime = async () => {
      const firstTime = await AuthService.isFirstTime();
      setIsFirstTime(firstTime);
      setShowTypeSelector(!firstTime); // Show selector only if not first time
      
      // Set default type based on first time status and current user role
      if (!firstTime && currentUserRole) {
        setFormData(prev => ({
          ...prev,
          type: currentUserRole === 'owner' ? 'admin' : 'cashier'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          type: 'owner'
        }));
      }
    };
    
    checkFirstTime();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

try {
      // Validar que todos los campos estén llenos
      if (!formData.nombre || !formData.apellidoPaterno || !formData.apellidoMaterno || 
          !formData.phone || !formData.email || !formData.password) {
        throw new Error(t('signup.camposObligatorios'));
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error(t('signup.emailValido'));
      }

      // Validar teléfono (mínimo 10 dígitos)
      if (formData.phone.length < 10) {
        throw new Error(t('signup.telefonoDigitos'));
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error(t('signup.passwordsNoCoinciden'));
      }

      if (formData.password.length < 6) {
        throw new Error(t('signup.passwordCaracteres'));
      }

      await onSignUp({
        nombre: formData.nombre,
        apellidoPaterno: formData.apellidoPaterno,
        apellidoMaterno: formData.apellidoMaterno,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        profileImage,
        type: showTypeSelector ? formData.type : undefined,
        currentUserRole
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signup.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearData = async () => {
    try {
      if (window.confirm(t('signup.confirmClearData'))) {
        await db.delete();
        window.location.reload();
      }
    } catch (error) {
      console.error('Clear data error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-primary text-primary flex flex-col items-center justify-center p-8 font-sans relative">
      {/* Back Button - Top Left */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 z-50 p-2 glass rounded-full hover:scale-110 transition-all duration-300 shadow-lg"
        aria-label={t('signup.goBack')}
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
        <div className="flex flex-col items-center mb-8">
          <img src="/icon.png" alt={t('signup.logo')} className="w-20 h-20 mb-4" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent text-center">
            {t('signup.createAccount')}
          </h2>
        </div>

         {/* Form Container */}
         <div className="glass-card rounded-2xl p-8">
          {/* Profile Image Upload */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt={t('signup.profile')} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

          </div>


          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.nombre')}</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.ingreseNombre')}
                required
              />
            </div>

            {/* Apellido Paterno */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.apellidoPaterno')}</label>
              <input
                type="text"
                value={formData.apellidoPaterno}
                onChange={(e) => setFormData({...formData, apellidoPaterno: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.ingreseApellidoPaterno')}
                required
              />
            </div>

            {/* Apellido Materno */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.apellidoMaterno')}</label>
              <input
                type="text"
                value={formData.apellidoMaterno}
                onChange={(e) => setFormData({...formData, apellidoMaterno: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.ingreseApellidoMaterno')}
                required
              />
            </div>


            {/* Phone */}
            <div>

              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.telefono')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.ingreseTelefono')}

                required
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.ingreseEmail')}
                required
              />
            </div>

            {/* User Type - Only show if not first time and currentUserRole is provided */}
            {showTypeSelector && currentUserRole && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-secondary">
                  {t('signup.userType', { role: currentUserRole === 'owner' ? '(Admin)' : '(Cashier)' })}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as UserType})}
                   className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                  required
                  disabled
                >
                  {currentUserRole === 'owner' ? (
                    <option value="admin" className="bg-neutral-800">{t('signup.admin')}</option>
                  ) : (
                    <option value="cashier" className="bg-neutral-800">{t('signup.cashier')}</option>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {currentUserRole === 'owner'
                    ? t('signup.ownerAdminOnly')
                    : t('signup.adminCashierOnly')
                  }
                </p>
              </div>
            )}

            {/* First Time Info */}
            {isFirstTime && (
              <div className="md:col-span-2 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-secondary text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('signup.firstUserOwner')}</span>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.password')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.enterPassword')}
                required
              />
            </div>


            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary">{t('signup.confirmPassword')}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 input-theme rounded-lg focus:outline-none transition-all"
                placeholder={t('signup.confirmPassword')}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="md:col-span-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="md:col-span-2 flex justify-center">
               <button
                 type="submit"
                 disabled={loading || !isFormValid}
                  className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] hover:from-[var(--accent-light)] hover:to-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
               >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('signup.creatingAccount')}
                  </>
                ) : t('signup.signUp')}
              </button>
            </div>
          </form>
        </div>
      </div>

       {/* Clear Data Button - Fixed Bottom Left */}
       <div className="fixed bottom-8 left-8 z-50">
         <button
           onClick={handleClearData}
           className="px-4 py-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-black/90 transition-all text-sm text-red-400 shadow-lg"
         >
            {t('signup.clearAllData')}
         </button>
       </div>
    </main>
  );
}

export default SignUpPage;