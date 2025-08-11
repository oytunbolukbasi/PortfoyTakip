import { useState } from "react";
import { Position } from "@shared/schema";
import { FullScreenModal } from './full-screen-modal';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice, formatTurkishPercent, formatFundPrice } from "@/lib/format";
import { RefreshCw, TrendingUp, TrendingDown, Calendar, Hash, Banknote, Target } from "lucide-react";

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
    <FullScreenModal 
      open={open} 
      onOpenChange={onOpenChange}
      title={position.symbol}
      description={position.name || 'Pozisyon Detayları'}
    >
      <div className="space-y-6">
        {/* iOS-style P&L Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {pl >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              <div className={`text-3xl font-bold ${pl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
              </div>
            </div>
            <div className={`text-lg font-medium ${pl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {pl >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {pl >= 0 ? 'Kar' : 'Zarar'}
            </div>
          </div>
        </div>

        {/* iOS-style Info Cards */}
        <div className="space-y-4">
          {/* Value Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
              <div className="p-6 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₺{formatTurkishPrice(value)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Güncel Değer</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₺{formatTurkishPrice(parseFloat(position.buyPrice) * position.quantity)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Alış Tutarı</div>
              </div>
            </div>
          </div>

          {/* Position Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="space-y-4">
              {/* Symbol & Type */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    position.type === 'stock' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <Hash className={`w-5 h-5 ${
                      position.type === 'stock' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                    }`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{position.symbol}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {position.type === 'stock' ? 'Hisse Senedi' : 'Yatırım Fonu'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{position.quantity.toLocaleString('tr-TR')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {position.type === 'fund' ? 'Pay Adedi' : 'Hisse Adedi'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buy Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {new Date(position.buyDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Alış Tarihi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="space-y-4">
              {/* Buy Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {position.type === 'fund' 
                        ? `${formatFundPrice(parseFloat(position.buyPrice))} TL`
                        : `${formatTurkishPrice(parseFloat(position.buyPrice))} TL`
                      }
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Alış Fiyatı</div>
                  </div>
                </div>
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {position.currentPrice ? 
                        position.type === 'fund'
                          ? `${formatFundPrice(parseFloat(position.currentPrice))} TL`
                          : `${formatTurkishPrice(parseFloat(position.currentPrice))} TL`
                        : '-'
                      }
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Güncel Fiyat</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshPrice}
                  disabled={isRefreshingPrice}
                  className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}