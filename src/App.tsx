import { useState, useEffect } from "react";
import "./App.css";
import StartPage from "./pages/welcome/StartPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/home/HomePage";
import { AuthService } from "./services/auth";
import { UserType, User } from "./database";

type Page = 'loading' | 'start' | 'signup' | 'login' | 'home';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      // Primero mostrar loading por 10 segundos
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verificar si hay una sesión activa
      const storedToken = await AuthService.getStoredToken();
      if (storedToken) {
        const user = await AuthService.getCurrentUser(storedToken);
        if (user) {
          setCurrentUser(user);
          setCurrentPage('home');
          return;
        }
      }

      // Verificar si es la primera vez
      const isFirstTime = await AuthService.isFirstTime();
      if (isFirstTime) {
        setCurrentPage('start');
      } else {
        setCurrentPage('login');
      }
    };

    initializeApp();
  }, []);

  const handleStart = () => {
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
      await AuthService.register(userData);
      setCurrentPage('login');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

const handleLogin = async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);
      setCurrentPage('home');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };



  const handleLogout = async () => {
    try {
      const token = await AuthService.getStoredToken();
      if (token) {
        await AuthService.logout(token);
      }
      setCurrentPage('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGoToLogin = () => {
    setCurrentPage('login');
  };



  

  const renderPage = () => {
    switch (currentPage) {
      case 'loading':
        return (
          <main className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden">
            {/* Background Decorative */}
            <div className="absolute top-0 -z-10 h-full w-full bg-gradient-to-b from-[#2e1065] via-[#581c87] to-[#6b21a8]">
              <div className="absolute bottom-auto left-auto right-0 top-20 h-[500px] w-[500px] -translate-x-[50%] rounded-full bg-[rgba(147,51,234,0.2)] opacity-50 blur-[120px]"></div>
              <div className="absolute bottom-20 left-20 h-[300px] w-[300px] rounded-full bg-[rgba(167,139,250,0.15)] opacity-40 blur-[100px]"></div>
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
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </main>
        );

      case 'start':
        return <StartPage onStart={handleStart} />;

      case 'signup':
        return <SignUpPage onSignUp={handleSignUp} currentUserRole={currentUser?.type} />;

case 'login':
        return <LoginPage onLogin={handleLogin} />;

      case 'home':
        return <HomePage onLogout={handleLogout} onGoToLogin={handleGoToLogin} />;

      default:
        return null;
    }
  };

  return renderPage();
}

export default App;