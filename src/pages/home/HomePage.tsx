import { useState, useEffect } from 'react';
import LanguageSelector from '../../components/LanguageSelector';
import { AuthService } from '../../services/auth';
import { User } from '../../database';

interface HomePageProps {
  onLogout: () => Promise<void>;
}

function HomePage({ onLogout }: HomePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
    </main>
  );
}

export default HomePage;