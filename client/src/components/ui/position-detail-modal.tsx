import { useState } from "react";
import { Position } from "@shared/schema";
import { FullScreenModal } from './full-screen-modal';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice, formatTurkishCurrency } from "@/lib/format";
import { RefreshCw } from "lucide-react";

interface PositionDetailModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PositionDetailModal({ position, open, onOpenChange, onUpdate }: PositionDetailModalProps) {
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const { toast } = useToast();

  const handleRefreshPrice = async () => {
    if (!position) return;
    
    setIsRefreshingPrice(true);
    try {
      const response = await fetch(`/api/positions/${position.id}/update-price`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Fiyat güncelleme başarısız');
      }

      toast({
        title: "Fiyat Güncellendi",
        description: `${position.symbol} güncel fiyatı alındı`,
      });

      onUpdate();
    } catch (error) {
      console.error('Price update error:', error);
      toast({
        title: "Hata",
        description: "Fiyat güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  if (!position) return null;

  const profit = position.currentPrice ? 
    (parseFloat(position.currentPrice) - parseFloat(position.buyPrice)) * position.quantity : 0;
  const profitPercent = position.currentPrice ? 
    ((parseFloat(position.currentPrice) - parseFloat(position.buyPrice)) / parseFloat(position.buyPrice)) * 100 : 0;

  return (
    <FullScreenModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Pozisyon Detayı"
      description={position?.symbol}
    >
      <div className="space-y-6">
        {/* Pozisyon Bilgileri */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Sembol</Label>
              <div className="text-lg font-semibold text-gray-900">{position.symbol}</div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-600">Tür</Label>
              <div className="text-sm text-gray-700">
                {position.type === 'stock' ? 'Hisse' : 'Fon'}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-600">Şirket Adı</Label>
            <div className="text-sm text-gray-700">{position.name || '-'}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Adet</Label>
              <div className="text-lg font-medium text-gray-900">{position.quantity.toLocaleString('tr-TR')}</div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Alış Tarihi</Label>
              <div className="text-sm text-gray-700">
                {new Date(position.buyDate).toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>
        </div>

        {/* Fiyat Bilgileri */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-blue-700">Alış Fiyatı</Label>
              <div className="text-lg font-semibold text-blue-900">
                ₺{formatTurkishPrice(parseFloat(position.buyPrice))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-blue-700">Güncel Fiyat</Label>
                <div className="text-lg font-semibold text-blue-900">
                  {position.currentPrice ? `₺${formatTurkishPrice(parseFloat(position.currentPrice))}` : '-'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPrice}
                disabled={isRefreshingPrice}
                className="p-2 h-8 w-8 text-blue-600 hover:bg-blue-100"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Kar/Zarar Bilgileri */}
        <div className={`rounded-xl p-4 space-y-4 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Toplam Değer
              </Label>
              <div className={`text-lg font-semibold ${profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {position.currentPrice ? 
                  formatTurkishCurrency(parseFloat(position.currentPrice) * position.quantity) : 
                  formatTurkishCurrency(parseFloat(position.buyPrice) * position.quantity)
                }
              </div>
            </div>

            <div>
              <Label className={`text-sm font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Kar/Zarar
              </Label>
              <div className={`text-lg font-semibold ${profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatTurkishCurrency(profit)}
              </div>
              <div className={`text-sm ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ({profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}