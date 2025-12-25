import { useState, useEffect } from 'react';
import { UserType } from '../database';
import { AuthService } from '../services/auth';
import { db } from '../database';

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
  currentUserRole?: UserType;
}

function SignUpPage({ onSignUp, currentUserRole }: SignUpPageProps) {
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
        throw new Error('Todos los campos son obligatorios');
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Ingrese un email válido');
      }

      // Validar teléfono (mínimo 10 dígitos)
      if (formData.phone.length < 10) {
        throw new Error('El teléfono debe tener al menos 10 dígitos');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
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
      setError(err instanceof Error ? err.message : 'Registration failed');
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
      if (window.confirm('Are you sure you want to clear all data? This will delete all users and sessions.')) {
        await db.delete();
        window.location.reload();
      }
    } catch (error) {
      console.error('Clear data error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-8 font-sans relative">
      {/* Background Decorative */}
      <div className="absolute top-0 -z-10 h-full w-full bg-gradient-to-b from-[#2e1065] via-[#581c87] to-[#6b21a8]">
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-[rgba(147,51,234,0.2)] opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full bg-[rgba(167,139,250,0.15)] opacity-40 blur-[100px]"></div>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
          Create Account
        </h2>

        {/* Profile Image Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
{/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-2 text-purple-200">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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
              value={formData.apellidoPaterno}
              onChange={(e) => setFormData({...formData, apellidoPaterno: e.target.value})}
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
              value={formData.apellidoMaterno}
              onChange={(e) => setFormData({...formData, apellidoMaterno: e.target.value})}
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
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
              placeholder="Ingrese su email"
              required
            />
          </div>

          {/* User Type - Only show if not first time and currentUserRole is provided */}
          {showTypeSelector && currentUserRole && (
            <div>
              <label className="block text-sm font-medium mb-2 text-purple-200">
                User Type {currentUserRole === 'owner' ? '(Admin)' : '(Cashier)'}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as UserType})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white"
                required
                disabled
              >
                {currentUserRole === 'owner' ? (
                  <option value="admin" className="bg-neutral-800">Admin</option>
                ) : (
                  <option value="cashier" className="bg-neutral-800">Cashier</option>
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {currentUserRole === 'owner' 
                  ? 'As Owner, you can only register Admin users'
                  : 'As Admin, you can only register Cashier users'
                }
              </p>
            </div>
          )}

          {/* First Time Info */}
          {isFirstTime && (
            <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-200 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>First user will be automatically set as Owner</span>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-purple-200">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
              placeholder="Confirm password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
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

      {/* Clear Data Button - Fixed Bottom Left */}
      <div className="fixed bottom-8 left-8 z-50">
        <button
          onClick={handleClearData}
          className="px-4 py-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-black/90 transition-all text-sm text-red-400 shadow-lg"
        >
          🗑️ Clear All Data (Testing)
        </button>
      </div>
    </main>
  );
}

export default SignUpPage;