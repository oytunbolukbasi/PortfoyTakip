import { useTheme } from "@/components/ui/theme-provider";
import { useAuth } from "@/lib/auth";
import { Moon, Sun, LogOut, ChevronRight, CircleUser, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/prices/refresh', { method: 'POST' });
      toast({
        description: "Fiyatlar güncellendi",
      });
    } catch (error) {
      toast({
        description: "Fiyatlar güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* iOS Style Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="flex items-center px-4 h-12">
          <h1 className="text-lg font-semibold text-foreground">Ayarlar</h1>
        </div>
      </header>

      <main className="p-4 space-y-8">
        {/* User Info Section */}
        <div className="flex items-center space-x-4 px-2 py-2">
          <div className="w-14 h-14 rounded-full bg-subtle flex items-center justify-center text-text-tertiary ring-1 ring-border shadow-sm">
            <CircleUser className="w-10 h-10 stroke-[1.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary leading-tight">
              {user?.username || 'Portföy App Kullanıcısı'}
            </h2>
            <p className="text-xs text-text-tertiary font-medium">Bireysel Yatırımcı</p>
          </div>
        </div>

        {/* Section 1: Appearance & Tools */}
        <div className="space-y-2">
          <h3 className="px-2 text-[11px] font-bold text-text-tertiary uppercase tracking-[0.05em]">Görünüm ve Araçlar</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm divide-y divide-border">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-4 active:bg-subtle transition-colors cursor-pointer" onClick={toggleTheme}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <span className="text-base font-medium text-text-primary">Karanlık Mod</span>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>

            {/* Refresh Prices */}
            <div className="flex items-center justify-between px-4 py-4 active:bg-subtle transition-colors cursor-pointer" onClick={handleRefresh}>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary-100 text-primary-500">
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-base font-medium text-text-primary">Fiyatları Güncelle</span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary" />
            </div>
          </div>
        </div>

        {/* Section 2: Account */}
        <div className="space-y-2">
          <h3 className="px-2 text-[11px] font-bold text-text-tertiary uppercase tracking-[0.05em]">Hesap</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <button 
              onClick={logout}
              className="w-full flex items-center justify-between px-4 py-4 active:bg-error-100/10 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-error-100 text-error-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-base font-medium text-error-500">Çıkış Yap</span>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="pt-12 pb-8 flex flex-col items-center">
          <span className="text-[10px] font-medium text-text-tertiary tracking-widest opacity-50 uppercase">Versiyon 2.2.0</span>
        </div>
      </main>
    </div>
  );
}

