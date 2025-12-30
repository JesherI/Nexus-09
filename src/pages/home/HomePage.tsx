import { useState, useEffect } from 'react';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';
import { AuthService } from '../../services/auth/auth';
import { User, UserType } from '../../db';
import { useTranslation } from 'react-i18next';

interface HomePageProps {
  currentUser?: User | null;
  onLogout: () => Promise<void>;
  onGoToLogin: () => void;
}

function HomePage({ currentUser, onLogout, onGoToLogin }: HomePageProps) {
  const t = useTranslation().t;
  const [user, setUser] = useState<User | null>(currentUser || null);
  const [loading, setLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Registration form state
  const [registrationData, setRegistrationData] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    type: user?.type === 'owner' ? 'admin' as UserType : 'cashier' as UserType
  });
  const [registrationProfileImage, setRegistrationProfileImage] = useState<string>('');
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

useEffect(() => {
    // Ya no hay persistencia de sesión, usar solo el usuario actual
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, [currentUser]);

  const loadAllUsers = async () => {
    try {
      const allUsers = await AuthService.getAllUsers();
      const businessUsers = allUsers.filter(u => u.businessId === user?.businessId);
      setAllUsers(businessUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    if (showUsersList) {
      loadAllUsers();
    }
  }, [showUsersList]);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await onLogout();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        try {
          await AuthService.updateProfile(user.id!, imageData);
          setUser({ ...user, profileImage: imageData });
        } catch (error) {
          console.error('Error updating profile image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError('');
    setRegistrationLoading(true);

    try {
      // Validate all fields are filled
      if (!registrationData.nombre || !registrationData.apellidoPaterno || !registrationData.apellidoMaterno || 
          !registrationData.phone || !registrationData.email || !registrationData.password) {
        throw new Error(t('home.camposObligatorios'));
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registrationData.email)) {
        throw new Error(t('home.emailValido'));
      }

      // Validate phone (minimum 10 digits)
      if (registrationData.phone.length < 10) {
        throw new Error(t('home.telefonoDigitos'));
      }

      if (registrationData.password !== registrationData.confirmPassword) {
        throw new Error(t('home.passwordsNoCoinciden'));
      }

      if (registrationData.password.length < 6) {
        throw new Error(t('home.passwordCaracteres'));
      }

      await AuthService.register({
        nombre: registrationData.nombre,
        apellidoPaterno: registrationData.apellidoPaterno,
        apellidoMaterno: registrationData.apellidoMaterno,
        phone: registrationData.phone,
        email: registrationData.email,
        password: registrationData.password,
        profileImage: registrationProfileImage,
        type: registrationData.type,
        currentUserRole: user?.type,
        businessId: user?.businessId
      });

      // Reset form
      setRegistrationData({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        type: user?.type === 'owner' ? 'admin' : 'cashier'
      });
      setRegistrationProfileImage('');
      setShowRegistrationForm(false);
      
      // Show success message (you could add a toast notification here)
      alert(t('home.usuarioRegistrado'));

    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : t('home.registrationFailed'));
    } finally {
      setRegistrationLoading(false);
    }
  };

const handleRegistrationImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegistrationProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


const handleDeleteUser = async (_userId: string) => {
    if (window.confirm(t('home.confirmDeleteUser'))) {
      try {
        // For now, just refresh the list since delete method doesn't exist
        await loadAllUsers(); 
        alert(t('home.deleteFunctionality'));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(t('home.errorDeletingUser'));
      }
    }
  };

  

  if (loading) {
    return (
      <main className="min-h-screen bg-primary text-primary flex items-center justify-center gradient-bg">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primary text-primary relative gradient-bg">
      {/* Background Decorative */}
      <div className="absolute top-0 -z-10 h-full w-full">
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
      </div>

      {/* Header */}
      <header className="relative z-40 bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/icon.png" alt={t('home.nexus')} className="w-8 h-8 mr-3 logo-enhanced" />
              <h1 className="text-xl font-bold text-enhanced">
                Nexus
              </h1>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4">
              <LanguageSelector dropdownPosition="down" />
              <ThemeToggle variant="switch" />
              
              <div className="relative z-50">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={t('home.profile')} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{user?.nombre} {user?.apellidoPaterno}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-black/80 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl z-50">
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                          {user?.profileImage ? (
                            <img src={user.profileImage} alt={t('home.profile')} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user?.nombre} {user?.apellidoPaterno}</p>
                          <p className="text-xs text-gray-400">{t('home.memberSinceDate', { date: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('home.unknown') })}</p>
                        </div>
                      </div>
                      
                       {/* Change Profile Image */}
                       <label className="mt-3 block w-full text-center px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg cursor-pointer transition-colors text-sm">
                         {t('home.changePhoto')}
                         <input
                           type="file"
                           accept="image/*"
                           onChange={handleImageChange}
                           className="hidden"
                         />
                       </label>

                       {/* Switch User */}
                       <button
                         onClick={() => { setShowProfileMenu(false); onGoToLogin(); }}
                         className="mt-3 w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
                       >
                         Cambiar de Usuario
                       </button>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-red-300 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('home.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4 text-enhanced">
            {t('home.welcomeBack', { nombre: user?.nombre, apellidoPaterno: user?.apellidoPaterno })}
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            {t('home.workspaceReady')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {/* Quick Stats */}
            <div className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-lg font-semibold mb-4 text-gradient">{t('home.quickStats')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-tertiary">{t('home.lastLogin')}</span>
                  <span className="text-secondary">{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('home.firstTime')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">{t('home.memberSince')}</span>
                  <span className="text-secondary">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('home.unknown')}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-lg font-semibold mb-4 text-gradient">{t('home.recentActivity')}</h3>
              <p className="text-sm text-tertiary">{t('home.noRecentActivity')}</p>
            </div>

{/* Quick Actions */}
            <div className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-lg font-semibold mb-4 text-gradient">{t('home.quickActions')}</h3>
              <div className="space-y-2">
{(user?.type === 'owner' || user?.type === 'admin') && (
                  <>
                    <button 
                      onClick={() => setShowRegistrationForm(true)}
                      className="w-full text-left px-3 py-2 accent-bg hover:accent-hover rounded-lg transition-all duration-300 text-sm text-white hover:scale-[1.02] shadow-md"
                    >
                      {t('home.registerNewUser')}
                    </button>
                    <button 
                      onClick={() => setShowUsersList(true)}
                      className="w-full text-left px-3 py-2 accent-bg hover:accent-hover rounded-lg transition-all duration-300 text-sm text-white hover:scale-[1.02] shadow-md"
                    >
                      {t('home.viewAllUsers')}
                    </button>
                  </>
                )}
                <button 
                  onClick={onGoToLogin}
                  className="w-full text-left px-3 py-2 accent-bg hover:accent-hover rounded-lg transition-all duration-300 text-sm text-white hover:scale-[1.02] shadow-md"
                >
                  {t('home.goToLogin')}
                </button>
                <button className="w-full text-left px-3 py-2 accent-bg hover:accent-hover rounded-lg transition-all duration-300 text-sm text-white hover:scale-[1.02] shadow-md">
                  {t('home.settings')}
                </button>
<button className="w-full text-left px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm">
                   {t('home.helpSupport')}
                 </button>


              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Form Full Screen */}
      {showRegistrationForm && (
        <div className="min-h-screen bg-primary text-primary relative">
          {/* Background Decorative */}
          <div className="absolute top-0 -z-10 h-full w-full">
            <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
            <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
          </div>

          {/* Header */}
          <div className="relative z-40 bg-black/10 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('home.backToHome')}
                </button>
                <h2 className="text-xl font-bold">{t('home.registerNewUser')}</h2>
                <div className="w-20"></div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
              {/* Profile Image Upload */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                    {registrationProfileImage ? (
                      <img src={registrationProfileImage} alt="Profile" className="w-full h-full object-cover" />
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
                      onChange={handleRegistrationImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <form onSubmit={handleRegistration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.nombre')}</label>
                    <input
                      type="text"
                      value={registrationData.nombre}
                      onChange={(e) => setRegistrationData({...registrationData, nombre: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.ingreseNombre')}
                      required
                    />
                  </div>

                  {/* Apellido Paterno */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.apellidoPaterno')}</label>
                    <input
                      type="text"
                      value={registrationData.apellidoPaterno}
                      onChange={(e) => setRegistrationData({...registrationData, apellidoPaterno: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.apellidoPaternoLabel')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Apellido Materno */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.apellidoMaterno')}</label>
                    <input
                      type="text"
                      value={registrationData.apellidoMaterno}
                      onChange={(e) => setRegistrationData({...registrationData, apellidoMaterno: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.apellidoMaternoLabel')}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.telefono')}</label>
                    <input
                      type="tel"
                      value={registrationData.phone}
                      onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.telefonoLabel')}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.email')}</label>
                  <input
                    type="email"
                    value={registrationData.email}
                    onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.emailLabel')}
                    required
                  />
                </div>

                {/* User Type */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.userType')}</label>
                  <select
                    value={registrationData.type}
                    onChange={(e) => setRegistrationData({...registrationData, type: e.target.value as UserType})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white"
                    required
                  >
                    <option value="admin" className="bg-neutral-800">{t('home.admin')}</option>
                    <option value="cashier" className="bg-neutral-800">{t('home.cashier')}</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.password')}</label>
                    <input
                      type="password"
                      value={registrationData.password}
                      onChange={(e) => setRegistrationData({...registrationData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.passwordLabel')}
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-purple-200">{t('home.confirmPassword')}</label>
                    <input
                      type="password"
                      value={registrationData.confirmPassword}
                      onChange={(e) => setRegistrationData({...registrationData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                      placeholder={t('home.confirmPasswordLabel')}
                      required
                    />
                  </div>
                </div>

                {/* Error Message */}
                {registrationError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200">
                    {registrationError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={registrationLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-lg"
                >
                  {registrationLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('home.creatingAccount')}
                    </>
                  ) : t('home.createUserAccount')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Users List Full Screen */}
      {showUsersList && (
        <div className="min-h-screen bg-primary text-primary relative">
          {/* Background Decorative */}
          <div className="absolute top-0 -z-10 h-full w-full">
            <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
            <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
          </div>

          {/* Header */}
          <div className="relative z-40 bg-black/10 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <button
                  onClick={() => setShowUsersList(false)}
                  className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('home.backToHome')}
                </button>
                <h2 className="text-xl font-bold">{t('home.allUsers', { count: allUsers.length })}</h2>
                <button
                  onClick={loadAllUsers}
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm"
                >
                  {t('home.refresh')}
                </button>
              </div>
            </div>
          </div>

          {/* Users Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
            {allUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">{t('home.noUsersFound')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allUsers.map((user) => (
                   <div key={user.id} className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
                     <div className="flex items-center gap-4 mb-4">
                       <div className="w-16 h-16 rounded-full accent-bg/20 border-2 accent/30 flex items-center justify-center overflow-hidden">
                         {user.profileImage ? (
                           <img src={user.profileImage} alt={t('home.profile')} className="w-full h-full object-cover" />
                         ) : (
                           <svg className="w-8 h-8 accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                         )}
                       </div>
                       <div>
                         <h3 className="font-semibold text-lg text-gradient">
                           {user.nombre} {user.apellidoPaterno}
                         </h3>
                         <p className="text-sm text-tertiary capitalize">{user.type}</p>
                       </div>
                     </div>
                     
                     <div className="space-y-2 text-sm text-secondary">
                       <p><span className="text-tertiary">{t('home.emailColon')}</span> {user.email}</p>
                       <p><span className="text-tertiary">{t('home.phoneColon')}</span> {user.phone}</p>
                       <p><span className="text-tertiary">{t('home.memberColon')}</span> {new Date(user.createdAt).toLocaleDateString()}</p>
                     </div>
                     
                     <div className="mt-4 flex gap-2">
                       <button
                         onClick={() => handleDeleteUser(user.id!)}
                         className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all duration-300 text-red-300 text-sm hover:scale-[1.02]"
                       >
                         {t('home.delete')}
                       </button>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default HomePage;