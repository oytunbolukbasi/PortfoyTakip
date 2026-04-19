import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position } from "@shared/schema";
import { DrawerModal } from "./drawer-modal";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice, formatTurkishPercent, formatFundPrice, formatPositionPrice, formatPositionValue } from "@/lib/format";

interface PositionDetailModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PositionDetailModal({ position, open, onOpenChange, onUpdate }: PositionDetailModalProps) {
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const { toast } = useToast();

  const { data: exchangeRateData } = useQuery<{pair: string; rate: number}>({
    queryKey: ['/api/exchange-rates', 'USDTRY'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rates?pair=USDTRY');
      return res.json();
    },
    enabled: !!position && position.type === 'us_stock',
  });

  if (!position) return null;

  const usdRate = exchangeRateData?.rate || 35.0;

  const calculatePL = () => {
    const buyPrice = parseFloat(position.buyPrice);
    const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
    const quantity = parseFloat(position.quantity);
    const buyRate = parseFloat(position.buyRate || '1.0');

    const pl = (currentPrice - buyPrice) * quantity;
    const plPercent = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
    const value = currentPrice * quantity;

    let plTRY = pl;
    let valueTRY = value;
    let costTRY = buyPrice * quantity;

    if (position.type === 'us_stock') {
      valueTRY = currentPrice * quantity * usdRate;
      costTRY = buyPrice * quantity * usdRate;
      plTRY = valueTRY - costTRY;
    }

    return { pl, plPercent, value, currentPrice, plTRY, valueTRY, costTRY };
  };

  const { pl, plPercent, value, plTRY } = calculatePL();

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

  const now = new Date();
  const updateTime = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const typeLabel =
    position.type === 'us_stock' ? 'ABD Hisse Senedi' :
    position.type === 'stock' ? 'Hisse Senedi' : 'Yatırım Fonu';

  const currentPriceFormatted = position.currentPrice
    ? position.type === 'us_stock'
      ? `$${formatTurkishPrice(parseFloat(position.currentPrice))}`
      : position.type === 'fund'
      ? `${formatFundPrice(parseFloat(position.currentPrice))} TL`
      : `${formatTurkishPrice(parseFloat(position.currentPrice))} TL`
    : '-';

  const buyDateFormatted = new Date(position.buyDate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const quantityFormatted = parseFloat(position.quantity).toLocaleString('tr-TR', {
    maximumFractionDigits: 10,
  });

  return (
    <DrawerModal
      open={open}
      onOpenChange={onOpenChange}
      title={position.symbol}
      description={position.name || 'Pozisyon Detayları'}
    >
      <div className="space-y-6">
        {/* P&L Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl py-5 px-6 border border-blue-100 dark:border-blue-800">
          <div className="text-center space-y-1">
            <div className={`text-3xl font-bold ${pl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {pl >= 0 ? '+' : '-'}{formatPositionValue(Math.abs(pl), position.type)}
            </div>
            {position.type === 'us_stock' && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {plTRY >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(plTRY))}
              </div>
            )}
          </div>
        </div>

        {/* Değer Özeti */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
            <div className="p-6 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPositionValue(value, position.type)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Güncel Değer</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPositionValue(parseFloat(position.buyPrice) * parseFloat(position.quantity), position.type)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Alış Tutarı</div>
            </div>
          </div>
        </div>

        {/* Detay Tablosu */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sembol</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{position.symbol}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tür</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{typeLabel}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {position.type === 'fund' ? 'Pay Adedi' : 'Adet'}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{quantityFormatted}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Alış Tarihi</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{buyDateFormatted}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Alış Fiyatı</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatPositionPrice(parseFloat(position.buyPrice), position.type)}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Güncel Fiyat</span>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentPriceFormatted}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {position.lastUpdated ? new Date(position.lastUpdated).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : updateTime}
                  </span>
                  <button 
                    onClick={handleRefreshPrice}
                    disabled={isRefreshingPrice}
                    className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                    Fiyatı Güncelle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DrawerModal>
  );
}