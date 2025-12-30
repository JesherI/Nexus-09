import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth/auth';
import { User, db } from '../db';
import NeuralParticles from '../components/NeuralParticles';
import { useTranslation } from 'react-i18next';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForceClose: () => Promise<void>;
}

function LoginPage({ onLogin, onForceClose }: LoginPageProps) {
  const t = useTranslation().t;
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await AuthService.getAllUsers();
        setUsers(allUsers);
        if (allUsers.length > 0 && !selectedUser) {
          setSelectedUser(allUsers[0]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError(t('login.selectUserError'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onLogin(selectedUser.email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserList(false);
    setPassword('');
    setError('');
  };

  const handleClearData = async () => {
    try {
      if (window.confirm(t('login.confirmClearData'))) {
        await db.delete();
        window.location.reload();
      }
    } catch (error) {
      console.error('Clear data error:', error);
    }
  };

  return (

    <main className="min-h-screen bg-primary text-primary flex flex-col items-center justify-center p-8 font-sans relative">
      {/* Neural Particles Background */}
      <NeuralParticles />

       {/* Background Decorative */}
       <div className="absolute top-0 h-full w-full gradient-bg" style={{ zIndex: 0 }}>
         <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
         <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
       </div>

 {/* User Profile Section - Windows Style */}
       <div className="mb-12 flex flex-col items-center" style={{ zIndex: 2 }}>
         {/* User Icon - Large and Centered */}
         <div className="relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full login-profile-container flex items-center justify-center overflow-hidden shadow-2xl mb-4 mx-auto">
            {selectedUser?.profileImage ? (
              <img src={selectedUser.profileImage} alt={t('login.profile')} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 md:w-24 md:h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

           {/* User Name */}
           {selectedUser && (
             <h2 className="text-3xl md:text-4xl font-bold text-center text-enhanced">
               {selectedUser.nombre} {selectedUser.apellidoPaterno}
             </h2>
           )}


         </div>


       </div>

{/* User List Dropdown */}
      {showUserList && (
         <div className="fixed bottom-20 left-8 w-80 glass-card rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-white/10">
            <p className="text-sm font-medium text-purple-200">{t('login.selectUser')}</p>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                 className={`w-full px-4 py-4 hover:bg-secondary transition-colors flex items-center gap-4 ${
                   selectedUser?.id === user.id ? 'bg-[var(--accent)]/20 border-l-4 border-[var(--accent)]' : ''
                 }`}
              >
                   <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)]/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={t('login.profile')} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.nombre} {user.apellidoPaterno}</p>
                  <p className="text-xs text-gray-400">{t('login.memberSinceDate', { date: new Date(user.createdAt).toLocaleDateString() })}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="w-full max-w-sm" style={{ zIndex: 2 }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Input */}
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-lg text-base login-input transition-all"
                placeholder={t('login.passwordPlaceholder')}
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !selectedUser}
            className="w-full accent-bg hover:accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-lg transition-all duration-300 text-base hover:scale-[1.02] shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                <span>{t('login.signingIn')}</span>
              </div>
            ) : t('login.signIn')}
          </button>
        </form>
      </div>

         {/* Clear Data Button - Below Sign In Form */}
        <div className="mt-8 text-center" style={{ zIndex: 2 }}>
          <button
            onClick={handleClearData}
            className="text-red-400 hover:text-red-300 text-sm transition-colors underline"
          >
             {t('login.clearAllData')}
          </button>
        </div>

        {/* Change User Button - Bottom Left */}
        {users.length > 1 && (
          <div className="absolute bottom-8 left-8 z-50">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 glass rounded-lg hover:scale-105 transition-all duration-300 shadow-lg text-sm"
            >
              Cambiar Usuario
            </button>
          </div>
        )}

       {/* Power Off Button - Bottom Right */}
       <div className="absolute bottom-8 right-8 z-50">
         <button
           onClick={onForceClose}
           className="p-3 glass rounded-full hover:scale-110 transition-all duration-300 shadow-lg"
            aria-label={t('login.shutdownApp')}
         >
           <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
           </svg>
         </button>
       </div>
    </main>
  );
}

export default LoginPage;