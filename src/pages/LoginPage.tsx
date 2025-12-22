import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';
import { User } from '../database';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToSignUp: () => void;
}

function LoginPage({ onLogin, onSwitchToSignUp }: LoginPageProps) {
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
      setError('Please select a user');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onLogin(selectedUser.username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-8 font-sans relative">
      {/* Background Decorative */}
      <div className="absolute top-0 -z-10 h-full w-full bg-gradient-to-b from-[#2e1065] via-[#581c87] to-[#6b21a8]">
        <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-[rgba(147,51,234,0.2)] opacity-50 blur-[120px]"></div>
        <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full bg-[rgba(167,139,250,0.15)] opacity-40 blur-[100px]"></div>
      </div>

      {/* User Profile Section - Windows Style */}
      <div className="mb-12">
        {/* User Icon - Large and Centered */}
        <div className="relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/30 border-4 border-purple-400/40 flex items-center justify-center overflow-hidden shadow-2xl mb-4">
            {selectedUser?.profileImage ? (
              <img src={selectedUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-20 h-20 md:w-24 md:h-24 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          
          {/* User Name */}
          {selectedUser && (
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white">
              {selectedUser.username}
            </h2>
          )}
        </div>

        {/* User Selector */}
        {users.length > 1 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/15 transition-all text-sm text-purple-200"
            >
              {users.length} users available
            </button>
          </div>
        )}
      </div>

      {/* User List Dropdown */}
      {showUserList && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl z-50">
          <div className="p-4 border-b border-white/10">
            <p className="text-sm font-medium text-purple-200">Select User</p>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full px-4 py-4 hover:bg-white/10 transition-colors flex items-center gap-4 ${
                  selectedUser?.id === user.id ? 'bg-purple-600/20 border-l-4 border-purple-400' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-purple-600/20 border-2 border-purple-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-gray-400">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Input */}
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-gray-900/80 border border-gray-700/50 rounded-lg focus:outline-none focus:border-gray-600 focus:bg-gray-900/90 focus:ring-2 focus:ring-gray-700 transition-all text-white placeholder-gray-500 text-base"
                placeholder="Password"
                required
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-gray-800/20 to-transparent pointer-events-none"></div>
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
            className="w-full bg-gray-800/90 hover:bg-gray-800 disabled:bg-gray-900/50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-lg transition-all duration-300 text-base border border-gray-700/50 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Switch to Sign Up */}
        <div className="mt-8 text-center">
          <button
            onClick={onSwitchToSignUp}
            className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;