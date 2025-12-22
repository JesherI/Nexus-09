import { useState } from 'react';

interface SignUpPageProps {
  onSignUp: (username: string, password: string, profileImage?: string) => Promise<void>;
}

function SignUpPage({ onSignUp }: SignUpPageProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      await onSignUp(formData.username, formData.password, profileImage);
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
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2 text-purple-200">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all text-white placeholder-gray-400"
              placeholder="Enter username"
              required
            />
          </div>

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
    </main>
  );
}

export default SignUpPage;