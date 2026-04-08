import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../context/store';
import { FaHome, FaComment, FaUsers, FaCircle, FaUser, FaMoon, FaSun, FaBell } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';

function Layout() {
    const location = useLocation();
    const { user } = useAuthStore();
    const { darkMode, toggleDarkMode } = useUIStore();

    const navItems = [
        { path: '/home', icon: FaHome, label: 'Home' },
        { path: '/stories', icon: FaCircle, label: 'Stories' },
        { path: '/profile', icon: FaUser, label: 'Profile' }
    ];

    return (
        <div className="relative z-10 min-h-screen flex flex-col text-cyan-50">
            {/* Navbar */}
            <nav className="h-16 glass-panel border-b border-white/20 flex items-center justify-between px-3 sm:px-4">
                <Link to="/" className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-500/90 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/40">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <span className="hidden sm:block text-xl font-bold tracking-wide text-cyan-100">ConnectHub</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <FaBell className="w-5 h-5 text-cyan-100" />
                    </button>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        {darkMode ? (
                            <FaSun className="w-5 h-5 text-cyan-100" />
                        ) : (
                            <FaMoon className="w-5 h-5 text-cyan-100" />
                        )}
                    </button>
                    <Link to="/profile" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <span className="text-cyan-100 font-semibold">
                                    {user?.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                            )}
                        </div>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto p-3 md:p-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 18, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -14, scale: 0.98 }}
                            transition={{ duration: 0.34, ease: 'easeOut' }}
                            className="glass-panel min-h-full overflow-hidden"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden h-16 glass-panel border-t border-white/20 flex items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 p-2 transition-transform ${isActive ? 'text-cyan-300 scale-105' : 'text-cyan-100/70'
                                }`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default Layout;
