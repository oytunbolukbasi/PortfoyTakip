import { useState } from "react";
import { Briefcase, BarChart3, User } from "lucide-react";
import { IoIosAddCircleOutline } from "react-icons/io";
import { Link, useLocation } from "wouter";
import AddPositionModal from "@/components/ui/add-position-modal";

interface BottomNavigationProps {
  activeTab?: string;
}

export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const [location] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe-area shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Portfolio Tab */}
          <Link href="/">
            <div className={`flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-90 cursor-pointer ${
              isActive("/")
                ? "text-primary-500 scale-110"
                : "text-text-tertiary hover:text-text-secondary"
            }`}>
              <Briefcase 
                className="w-6 h-6" 
                strokeWidth={isActive("/") ? 2.5 : 1.5} 
              />
            </div>
          </Link>

          {/* Add Position Action */}
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-90 cursor-pointer ${
              showAddModal
                ? "text-primary-500 scale-110"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <IoIosAddCircleOutline 
              className="w-7 h-7" 
              style={{ strokeWidth: showAddModal ? '2' : '1' }}
            />
          </button>

          {/* Analytics Tab */}
          <Link href="/analytics">
            <div className={`flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-90 cursor-pointer ${
              isActive("/analytics")
                ? "text-primary-500 scale-110"
                : "text-text-tertiary hover:text-text-secondary"
            }`}>
              <BarChart3 
                className="w-6 h-6" 
                strokeWidth={isActive("/analytics") ? 2.5 : 1.5} 
              />
            </div>
          </Link>

          {/* Profile Tab */}
          <Link href="/profile">
            <div className={`flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-90 cursor-pointer ${
              isActive("/profile")
                ? "text-primary-500 scale-110"
                : "text-text-tertiary hover:text-text-secondary"
            }`}>
              <User 
                className="w-6 h-6" 
                strokeWidth={isActive("/profile") ? 2.5 : 1.5} 
              />
            </div>
          </Link>
        </div>
      </nav>

      <AddPositionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => setShowAddModal(false)}
      />
    </>
  );
}