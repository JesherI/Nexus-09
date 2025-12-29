import { useState, useEffect } from "react";
import "./App.css";
import "./styles/themes.css";
import StartPage from "./pages/welcome/StartPage";
import BusinessSetupPage from "./pages/BusinessSetupPage";
import PosSetupPage from "./pages/PosSetupPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/home/HomePage";
import { AuthService } from "./services/auth";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserType, User, db } from "./database";
import { invoke } from "@tauri-apps/api/core";

type Page = 'loading' | 'start' | 'business' | 'pos' | 'signup' | 'login' | 'home';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

useEffect(() => {
    const initializeApp = async () => {
      // Primero mostrar loading por 10 segundos
      await new Promise(resolve => setTimeout(resolve, 10000));

       // Sync Firebase users to local DB
       await AuthService.syncFirebaseUsers();

       // Verificar si es la primera vez
      let isFirstTime: boolean;
      try {
        isFirstTime = await AuthService.isFirstTime();
      } catch (error: any) {
        // Si hay error de upgrade de base de datos, limpiar y reiniciar
        if (error.name === 'DatabaseClosedError' && error.message.includes('UpgradeError')) {
          console.log('Database upgrade failed, clearing database...');
          await db.delete();
          window.location.reload();
          return;
        }
        throw error;
      }
      if (isFirstTime) {
        setCurrentPage('start');
      } else {
        setCurrentPage('login');
      }
    };

    initializeApp();
  }, []);

  const handleStart = () => {
    setCurrentPage('business');
  };

  const handleBusinessSetup = (id: string) => {
    setBusinessId(id);
    setCurrentPage('pos');
  };

  const handlePosSetup = () => {
    setCurrentPage('signup');
  };

  const handleSignUp = async (userData: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
    type?: UserType;
    currentUserRole?: UserType;
  }) => {
    try {
      // Use AuthService which now handles both local and Firebase registration
      await AuthService.register({ ...userData, businessId: businessId || undefined });
      setCurrentPage('login');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      // Use AuthService which now handles both Firebase and local login
      const { user } = await AuthService.login(email, password);
       setCurrentUser(user);
       setBusinessId(user.businessId || null);
       setCurrentPage('home');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };



const handleLogout = async () => {
    try {
      // Logout from Firebase
      const { FirebaseServices } = await import('./services/firebaseServices');
      await FirebaseServices.logout();
      // Limpiar sesión local
      await AuthService.removeStoredToken();
      setCurrentUser(null);
      setBusinessId(null);
      setCurrentPage('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleForceClose = async () => {
    try {
      await invoke('force_close_app');
    } catch (error) {
      console.error('Error closing app:', error);
    }
  };

  const handleGoToLogin = () => {
    setCurrentPage('login');
  };



  

  const renderPage = () => {
    switch (currentPage) {
      case 'loading':
        return (
          <main className="min-h-screen bg-primary text-primary flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden gradient-bg">
            {/* Background Decorative */}
            <div className="absolute top-0 -z-10 h-full w-full">
              <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full decoration-secondary opacity-50 decoration-blur-primary"></div>
              <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full decoration-tertiary opacity-40 decoration-blur-secondary"></div>
            </div>

            {/* Logo flotante animado */}
            <div className="relative z-10">
              <img 
                src="/icon.png" 
                alt="logo" 
                className="w-32 h-32 md:w-48 md:h-48 floating-logo"
              />
            </div>

            {/* Loading indicator */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-2">
                <div className="w-3 h-3 accent-bg rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 accent-bg rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 accent-bg rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </main>
        );

      case 'start':
        return <StartPage onStart={handleStart} />;

      case 'business':
        return <BusinessSetupPage onBusinessSetup={handleBusinessSetup} onBack={() => setCurrentPage('start')} />;

      case 'pos':
        return <PosSetupPage businessId={businessId!} onPosSetup={handlePosSetup} onBack={() => setCurrentPage('business')} />;

      case 'signup':
        return <SignUpPage onSignUp={handleSignUp} onBack={() => setCurrentPage('pos')} currentUserRole={undefined} />;

case 'login':
        return <LoginPage onLogin={handleLogin} onForceClose={handleForceClose} />;

case 'home':
        return <HomePage currentUser={currentUser} onLogout={handleLogout} onGoToLogin={handleGoToLogin} />;

      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      {renderPage()}
    </ThemeProvider>
  );
}

export default App;