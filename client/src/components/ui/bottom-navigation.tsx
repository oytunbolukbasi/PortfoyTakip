import { Briefcase, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";

interface BottomNavigationProps {
  activeTab?: string;
}

export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe-area">
      <div className="flex items-center justify-around h-16 px-4 pb-2">
        <Link href="/">
          <div className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors cursor-pointer ${
            isActive("/") 
              ? "text-blue-600 bg-blue-50" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
            <Briefcase className="w-6 h-6" />
            <span className="text-xs font-medium">Portföy</span>
          </div>
        </Link>
        
        <Link href="/analytics">
          <div className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors cursor-pointer ${
            isActive("/analytics") 
              ? "text-blue-600 bg-blue-50" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Analiz</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}