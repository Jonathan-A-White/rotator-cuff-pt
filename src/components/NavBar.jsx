import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  {
    label: 'Home',
    path: '/',
    icon: (
      // House icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
      </svg>
    ),
  },
  {
    label: 'Progress',
    path: '/progress',
    icon: (
      // Chart-bar icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="12" width="4" height="8" rx="0.5" />
        <rect x="10" y="8" width="4" height="12" rx="0.5" />
        <rect x="17" y="4" width="4" height="16" rx="0.5" />
      </svg>
    ),
  },
  {
    label: 'Assess',
    path: '/assessment',
    icon: (
      // Clipboard icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3h6v2H9z" />
        <path d="M9 10h6M9 14h4" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      // Gear icon
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-[#2C2C2E] border-t border-gray-200 dark:border-[#3A3A3C] pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ label, path, icon }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex flex-col items-center justify-center gap-0.5
                touch-target min-h-[48px] min-w-[48px] px-2
                transition-colors duration-150
                ${isActive
                  ? 'text-teal dark:text-teal-light'
                  : 'text-muted dark:text-muted-dark'
                }
              `}
            >
              {icon}
              <span className="text-[10px] leading-none font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
