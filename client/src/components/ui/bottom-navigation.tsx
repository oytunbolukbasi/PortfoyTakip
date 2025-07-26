import { Link, useLocation } from "wouter";

interface BottomNavigationProps {
  activeTab: string;
}

export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { 
      id: 'portfolio', 
      label: 'Portföy', 
      icon: 'M11,2V22C5.9,21.5 2,17.2 2,12S5.9,2.5 11,2M13,2V11H22C22,6.8 18.2,3 13,2M13,13V22C18.1,21.5 22,17.2 22,13H13Z',
      href: '/'
    },
    { 
      id: 'markets', 
      label: 'Piyasalar', 
      icon: 'M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z',
      href: '/markets'
    },
    { 
      id: 'analysis', 
      label: 'Analiz', 
      icon: 'M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z',
      href: '/analysis'
    },
    { 
      id: 'profile', 
      label: 'Profil', 
      icon: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
      href: '/profile'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 z-40">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center ${
                isActive ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-5 h-5 mb-1"
              >
                <path d={item.icon} />
              </svg>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
