import { useState } from "react";
import { Position } from "@shared/schema";
import { FullScreenModal } from './full-screen-modal';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice, formatTurkishPercent, formatFundPrice } from "@/lib/format";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface PositionDetailModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PositionDetailModal({ position, open, onOpenChange, onUpdate }: PositionDetailModalProps) {
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const { toast } = useToast();

  if (!position) return null;

  const calculatePL = () => {
    const buyPrice = parseFloat(position.buyPrice);
    const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
    const quantity = position.quantity;
    
    const pl = (currentPrice - buyPrice) * quantity;
    const plPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
    const value = currentPrice * quantity;
    
    return { pl, plPercent, value, currentPrice };
  };

  const { pl, plPercent, value } = calculatePL();

  const handleRefreshPrice = async () => {
    setIsRefreshingPrice(true);
    try {
      const response = await fetch(`/api/positions/${position.id}/refresh-price`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Fiyat güncelleme başarısız');
      }

      toast({
        title: "Başarılı",
        description: "Fiyat güncellendi",
      });

      onUpdate();
    } catch (error) {
      console.error('Price refresh error:', error);
      toast({
        title: "Hata",
        description: "Fiyat güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  return (
    <FullScreenModal open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{position.symbol}</h2>
              <p className="text-sm text-muted-foreground">
                {position.name || 'Pozisyon Detayları'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
              </div>
              <div className={`text-sm ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pl >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                {pl >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Overview Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Pozisyon Özeti</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Toplam Değer</p>
                <p className="text-xl font-bold text-gray-900">₺{formatTurkishPrice(value)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Kar/Zarar</p>
                <p className={`text-xl font-bold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
                </p>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Pozisyon Bilgileri</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sembol</Label>
                <div className="text-lg font-semibold">{position.symbol}</div>
              </div>
              
              <div>
                <Label>Tür</Label>
                <div className="text-sm text-muted-foreground">
                  {position.type === 'stock' ? 'Hisse' : 'Fon'}
                </div>
              </div>
            </div>

            <div>
              <Label>Şirket/Fon Adı</Label>
              <div className="text-sm">{position.name || '-'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Adet</Label>
                <div className="text-lg font-medium">{position.quantity}</div>
              </div>

              <div>
                <Label>Alış Tarihi</Label>
                <div className="text-sm text-muted-foreground">
                  {new Date(position.buyDate).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alış Fiyatı</Label>
                <div className="text-lg font-medium">
                  {position.type === 'fund' 
                    ? `${formatFundPrice(parseFloat(position.buyPrice))} TL`
                    : `${formatTurkishPrice(parseFloat(position.buyPrice))} TL`
                  }
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  Güncel Fiyat
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshPrice}
                    disabled={isRefreshingPrice}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                  </Button>
                </Label>
                <div className="text-lg font-medium">
                  {position.currentPrice ? 
                    position.type === 'fund'
                      ? `${formatFundPrice(parseFloat(position.currentPrice))} TL`
                      : `${formatTurkishPrice(parseFloat(position.currentPrice))} TL`
                    : '-'
                  }
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Performans</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Maliyet:</span>
                  <span className="font-medium">
                    ₺{formatTurkishPrice(parseFloat(position.buyPrice) * position.quantity)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Güncel Değer:</span>
                  <span className="font-medium">₺{formatTurkishPrice(value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kar/Zarar:</span>
                  <span className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kar/Zarar (%):</span>
                  <span className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pl >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Kapat
          </Button>
        </div>
      </div>
    </FullScreenModal>
  );
}