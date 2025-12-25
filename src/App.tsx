import { useState, useEffect } from "react";
import "./App.css";
import "./styles/themes.css";
import StartPage from "./pages/welcome/StartPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/home/HomePage";
import { AuthService } from "./services/auth";
import { UserType } from "./database";
import { ThemeProvider } from "./contexts/ThemeContext";

type Page = 'loading' | 'start' | 'signup' | 'login' | 'home';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('loading');

useEffect(() => {
    const initializeApp = async () => {
      // Limpiar todas las sesiones existentes para forzar login
      await AuthService.clearAllSessions();
      
      // Primero mostrar loading por 10 segundos
      await new Promise(resolve => setTimeout(resolve, 10000));

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
        return <SignUpPage onSignUp={handleSignUp} currentUserRole={undefined} />;

case 'login':
        return <LoginPage onLogin={handleLogin} />;

      case 'home':
        return <HomePage onLogout={handleLogout} onGoToLogin={handleGoToLogin} />;

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