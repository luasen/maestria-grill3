import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import MotoboyOrderNotification from './components/MotoboyOrderNotification';
import InstallAppPrompt from './components/InstallAppPrompt';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import Motoboy from './pages/Motoboy';
import MyOrders from './pages/MyOrders';
import { motion, AnimatePresence } from 'motion/react';
import { Settings } from 'lucide-react';

function AppContent() {
  const { activeView, setActiveView, settings } = useApp();
  const { user, profile, isAuthOpen, setIsAuthOpen, logout } = useAuth();

  // Maintenance mode check: active settings with maintenanceMode enabled, and user is not an admin/superadmin
  if (settings?.maintenanceMode && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return (
      <div 
        className="relative mx-auto min-h-screen w-full max-w-lg border-x border-white/30 shadow-2xl flex flex-col items-center justify-center p-6 text-center transition-colors duration-300"
        style={{ backgroundColor: 'var(--site-bg-color, #fff7f4)' }}
      >
        {/* Background blurred orbs */}
        <div className="absolute top-[10%] left-[5%] w-[250px] h-[250px] bg-orange-200 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px] opacity-35 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="rounded-full bg-orange-100 p-5 text-orange-600 mb-6 animate-pulse shadow-sm">
            <Settings className="h-12 w-12" />
          </div>
          <h1 className="font-sans text-2xl font-black text-gray-900 tracking-tight mb-2">
            {settings?.name || 'Maestria Grill'}
          </h1>
          <p className="font-sans text-base font-bold text-orange-600 mb-4 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
            🔧 O sistema está em manutenção.
          </p>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-8">
            Estamos preparando novidades deliciosas para você! Por favor, volte em instantes. Agradecemos a sua compreensão.
          </p>

          {/* Option for Admins to log in */}
          <div className="border-t border-gray-200 pt-6 w-full max-w-xs flex flex-col items-center">
            {user ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-gray-500">
                  Logado como: <strong className="text-gray-700">{profile?.name || user.email}</strong> (<span className="capitalize font-semibold">{profile?.role || 'cliente'}</span>)
                </p>
                <button
                  onClick={() => logout()}
                  className="text-[10px] text-orange-600 hover:underline font-bold transition"
                >
                  Entrar com outra conta
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="rounded-xl bg-gray-900 text-white text-xs font-bold py-2.5 px-6 hover:bg-gray-800 transition shadow-sm active:scale-95"
              >
                Acesso Administrativo
              </button>
            )}
          </div>
        </div>

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </div>
    );
  }

  // Custom header parameters based on active view
  const getHeaderProps = () => {
    switch (activeView) {
      case 'home':
        return { showBack: false };
      case 'menu':
        return { title: 'Cardápio', showBack: true, onBack: () => setActiveView('home') };
      case 'cart':
        return { title: 'Meu Carrinho', showBack: true, onBack: () => setActiveView('menu') };
      case 'checkout':
        return { title: 'Finalizar Pedido', showBack: true, onBack: () => setActiveView('cart') };
      case 'admin':
        return { title: 'Gestão do Restaurante', showBack: true, onBack: () => setActiveView('home') };
      case 'motoboy':
        return { title: 'Área do Motoboy', showBack: true, onBack: () => setActiveView('home') };
      case 'my-orders':
        return { title: 'Minha Conta', showBack: true, onBack: () => setActiveView('home') };
      default:
        return {};
    }
  };

  // Switch between view components
  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <Home />;
      case 'menu':
        return <Menu />;
      case 'cart':
        return <Cart />;
      case 'checkout':
        return <Checkout />;
      case 'admin':
        return <Admin />;
      case 'motoboy':
        return <Motoboy />;
      case 'my-orders':
        return <MyOrders />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-lg bg-white/50 backdrop-blur-xl border-x border-white/30 shadow-2xl flex flex-col">
      {/* Dynamic Header */}
      <Header {...getHeaderProps()} />

      {/* Main Content Area with Transitions */}
      <main className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Bottom Nav */}
      <BottomNav />

      {/* Motoboy Real-time Delivery Order Popup */}
      <MotoboyOrderNotification />

      {/* App Installation Banner / Modal Notification */}
      <InstallAppPrompt />

      {/* Auth Modal overlay at absolute top layer */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <CartProvider>
          <div 
            className="min-h-screen w-full relative overflow-hidden flex items-center justify-center transition-colors duration-300"
            style={{ backgroundColor: 'var(--site-bg-color, #fff7f4)' }}
          >
            {/* Background blurred orbs */}
            <div className="fixed top-[-10%] left-[-5%] w-[400px] h-[400px] bg-orange-200 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-rose-200 rounded-full blur-[120px] opacity-35 pointer-events-none"></div>
            
            <AppContent />
          </div>
        </CartProvider>
      </AppProvider>
    </AuthProvider>
  );
}

