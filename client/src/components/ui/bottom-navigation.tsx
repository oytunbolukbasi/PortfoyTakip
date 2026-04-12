import { useState } from "react";
import { Briefcase, BarChart3, LogOut } from "lucide-react";
import { IoIosAddCircleOutline } from "react-icons/io";
import { Link, useLocation } from "wouter";
import AddPositionModal from "@/components/ui/add-position-modal";
import { useAuth } from "@/lib/auth";

interface BottomNavigationProps {
  activeTab?: string;
}

export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const [location] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe-area">
        <div className="flex items-center justify-around h-16 px-4 pb-2">
          <Link href="/">
            <div className={`flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
              isActive("/")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}>
              <Briefcase className="w-6 h-6" />
            </div>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
              showAddModal
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <IoIosAddCircleOutline className="w-6 h-6" />
          </button>

          <Link href="/analytics">
            <div className={`flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
              isActive("/analytics")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}>
              <BarChart3 className="w-6 h-6" />
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-6 h-6" />
          </button>
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