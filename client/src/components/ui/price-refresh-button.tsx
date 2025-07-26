import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PriceRefreshButtonProps {
  onRefresh?: () => void;
}

export function PriceRefreshButton({ onRefresh }: PriceRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/price-monitor/update-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Fiyat güncelleme başarısız');
      }
      
      const result = await response.json();
      const successCount = result.results?.filter((r: any) => r.success).length || 0;
      const totalCount = result.results?.length || 0;
      
      toast({
        title: "Fiyatlar Güncellendi",
        description: `${successCount}/${totalCount} pozisyon başarıyla güncellendi`,
      });
      
      // Trigger parent refresh
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      console.error('Price refresh error:', error);
      toast({
        title: "Hata",
        description: "Fiyat güncelleme sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <TrendingUp className="h-4 w-4" />
      {isRefreshing ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}
    </Button>
  );
}