import { useState, useEffect } from 'react';
import LanguageSelector from '../../components/LanguageSelector';
import { AuthService } from '../../services/auth';
import { User, UserType } from '../../database';

interface HomePageProps {
  onLogout: () => Promise<void>;
  onGoToLogin: () => void;
}

function HomePage({ onLogout, onGoToLogin }: HomePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
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
    const loadUser = async () => {
      try {
        const token = await AuthService.getStoredToken();
        if (token) {
          const currentUser = await AuthService.getCurrentUser(token);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

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
        throw new Error('Todos los campos son obligatorios');
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registrationData.email)) {
        throw new Error('Ingrese un email válido');
      }

      // Validate phone (minimum 10 digits)
      if (registrationData.phone.length < 10) {
        throw new Error('El teléfono debe tener al menos 10 dígitos');
      }

      if (registrationData.password !== registrationData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (registrationData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
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
        currentUserRole: user?.type
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
      alert('Usuario registrado exitosamente');

    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Registration failed');
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

  

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white relative">
      {/* Background Decorative */}
      <div className="absolute top-0 -z-10 h-full w-full bg-gradient-to-b from-[#2e1065] via-[#581c87] to-[#6b21a8]">
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-[rgba(147,51,234,0.2)] opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full bg-[rgba(167,139,250,0.15)] opacity-40 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-40 bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img src="/icon.png" alt="Nexus" className="w-8 h-8 mr-3" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                Nexus
              </h1>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4">
              <LanguageSelector dropdownPosition="down" />
              
              <div className="relative z-50">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
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
                            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user?.nombre} {user?.apellidoPaterno}</p>
                          <p className="text-xs text-gray-400">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                      </div>
                      
                      {/* Change Profile Image */}
                      <label className="mt-3 block w-full text-center px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg cursor-pointer transition-colors text-sm">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-red-300 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
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
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
            Welcome back, {user?.nombre} {user?.apellidoPaterno}!
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Your Nexus workspace is ready
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {/* Quick Stats */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Login:</span>
                  <span>{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'First time'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since:</span>
                  <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Recent Activity</h3>
              <p className="text-sm text-gray-400">No recent activity</p>
            </div>

{/* Quick Actions */}
            <div className="bg-black/20 backdrop-blur-lg rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-300">Quick Actions</h3>
              <div className="space-y-2">
                {(user?.type === 'owner' || user?.type === 'admin') && (
                  <button 
                    onClick={() => setShowRegistrationForm(true)}
                    className="w-full text-left px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm"
                  >
                    Register New User
                  </button>
                )}
                <button 
                  onClick={onGoToLogin}
                  className="w-full text-left px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm"
                >
                  Go to Login
                </button>
                <button className="w-full text-left px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm">
                  Settings
                </button>
                <button className="w-full text-left px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors text-sm">
                  Help & Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Modal */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-black/90 backdrop-blur-lg rounded-2xl border border-white/10 p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Register New {user?.type === 'owner' ? 'Admin' : 'Cashier'} User
              </h2>
              <button
                onClick={() => setShowRegistrationForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Image Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
                  {registrationProfileImage ? (
                    <img src={registrationProfileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Nombre</label>
                <input
                  type="text"
                  value={registrationData.nombre}
                  onChange={(e) => setRegistrationData({...registrationData, nombre: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Ingrese su nombre"
                  required
                />
              </div>

              {/* Apellido Paterno */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Apellido Paterno</label>
                <input
                  type="text"
                  value={registrationData.apellidoPaterno}
                  onChange={(e) => setRegistrationData({...registrationData, apellidoPaterno: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Ingrese su apellido paterno"
                  required
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Apellido Materno</label>
                <input
                  type="text"
                  value={registrationData.apellidoMaterno}
                  onChange={(e) => setRegistrationData({...registrationData, apellidoMaterno: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Ingrese su apellido materno"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Teléfono</label>
                <input
                  type="tel"
                  value={registrationData.phone}
                  onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Ingrese su teléfono"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Email</label>
                <input
                  type="email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Ingrese su email"
                  required
                />
              </div>

              {/* User Type */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">User Type</label>
                <select
                  value={registrationData.type}
                  onChange={(e) => setRegistrationData({...registrationData, type: e.target.value as UserType})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white"
                  required
                  disabled
                >
                  <option value={user?.type === 'owner' ? 'admin' : 'cashier'} className="bg-neutral-800">
                    {user?.type === 'owner' ? 'Admin' : 'Cashier'}
                  </option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  As {user?.type === 'owner' ? 'Owner' : 'Admin'}, you can only register {user?.type === 'owner' ? 'Admin' : 'Cashier'} users
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Password</label>
                <input
                  type="password"
                  value={registrationData.password}
                  onChange={(e) => setRegistrationData({...registrationData, password: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Enter password"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-200">Confirm Password</label>
                <input
                  type="password"
                  value={registrationData.confirmPassword}
                  onChange={(e) => setRegistrationData({...registrationData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
                  placeholder="Confirm password"
                  required
                />
              </div>

              {/* Error Message */}
              {registrationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                  {registrationError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registrationLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {registrationLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default HomePage;