import { useState } from "react";
import { Position } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent, formatFundPrice, parseTurkishPrice } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FullScreenModal } from './full-screen-modal';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PositionCardProps {
  position: Position;
  onRefresh: () => void;
  onClick?: () => void;
}

export default function PositionCard({ position, onRefresh, onClick }: PositionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const calculatePL = () => {
    const buyPrice = parseFloat(position.buyPrice);
    const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
    const quantity = position.quantity;
    
    const pl = (currentPrice - buyPrice) * quantity;
    const plPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
    const value = currentPrice * quantity;
    
    return { pl, plPercent, value, currentPrice };
  };

  const { pl, plPercent, value, currentPrice } = calculatePL();
  const change = position.currentPrice ? 
    ((currentPrice - parseFloat(position.buyPrice)) / parseFloat(position.buyPrice)) * 100 : 0;

  const handleDelete = async () => {
    try {
      await apiRequest('DELETE', `/api/positions/${position.id}`);
      onRefresh();
      toast({
        title: "Pozisyon silindi",
        description: `${position.symbol} pozisyonu başarıyla silindi.`,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Pozisyon silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  const handleClose = async () => {
    if (!sellPrice) {
      toast({
        title: "Hata",
        description: "Satış fiyatı giriniz.",
        variant: "destructive",
      });
      return;
    }

    // Convert Turkish format to decimal format
    const numericPrice = parseFloat(sellPrice.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast({
        title: "Hata",
        description: "Geçerli bir satış fiyatı giriniz.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', `/api/positions/${position.id}/close`, {
        sellPrice: numericPrice.toString(),
        sellDate,
      });
      onRefresh();
      toast({
        title: "Pozisyon kapatıldı",
        description: `${position.symbol} pozisyonu başarıyla kapatıldı.`,
      });
      
      // Auto-refresh closed positions
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshClosedPositions'));
      }, 1000);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Pozisyon kapatılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
    setShowCloseDialog(false);
    setSellPrice('');
  };

  return (
    <>
      <div 
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={(e) => {
          // Don't trigger onClick if clicking on the dropdown menu or its trigger
          const target = e.target as HTMLElement;
          const dropdown = target.closest('[data-dropdown]');
          if (!dropdown) {
            onClick?.();
          }
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{position.symbol}</h3>
                <p className="text-sm text-gray-500">{position.name || position.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">₺{position.type === 'fund' ? formatFundPrice(currentPrice) : formatTurkishPrice(currentPrice)}</p>
              <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {formatTurkishPercent(change)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">{position.type === 'fund' ? 'Pay' : 'Adet'}</p>
              <p className="font-semibold text-gray-900">{position.quantity.toLocaleString('tr-TR')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Alış</p>
              <p className="font-semibold text-gray-900">₺{position.type === 'fund' ? formatFundPrice(parseFloat(position.buyPrice)) : formatTurkishPrice(parseFloat(position.buyPrice))}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Değer</p>
              <p className="font-semibold text-gray-900">{formatTurkishCurrency(value)}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* K/Z bilgisi için ayrı satır */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">K/Z:</span>
                <div className="text-right">
                  <div className={`font-semibold text-lg ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatTurkishCurrency(pl)}
                  </div>
                  <div className={`text-sm ${plPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({formatTurkishPercent(plPercent)})
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-center space-x-4 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCloseDialog(true);
                  setSellPrice(position.currentPrice ? parseFloat(position.currentPrice).toFixed(2).replace('.', ',') : '0,00');
                  setSellDate(new Date().toISOString().split('T')[0]);
                }}
                className="flex-1 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 rounded-xl font-semibold py-3"
              >
                <span className="mr-2">✓</span>
                KAPAT
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                className="flex-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 rounded-xl font-semibold py-3"
              >
                <span className="mr-2">✕</span>
                SİL
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Bottom Sheet */}
      {/* Delete Position Modal */}
      <FullScreenModal 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
        title="Pozisyonu Sil"
        description={`${position.symbol} pozisyonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
      >
        <div className="flex flex-col space-y-2 mt-6">
          <Button 
            onClick={handleDelete} 
            className="w-full bg-red-600 text-white hover:bg-red-700 py-3"
          >
            Evet, Sil
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteDialog(false)} 
            className="w-full py-3"
          >
            İptal
          </Button>
        </div>
      </FullScreenModal>

      {/* Close Position Modal */}
      <FullScreenModal 
        open={showCloseDialog} 
        onOpenChange={setShowCloseDialog}
        title="Pozisyonu Kapat"
        description={position.symbol}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="sellPrice" className="text-sm font-medium">Satış Fiyatı (₺)</Label>
            <Input
              id="sellPrice"
              type="text"
              value={sellPrice}
              onChange={(e) => {
                // Only allow digits and comma
                const value = e.target.value.replace(/[^\d,]/g, '');
                setSellPrice(value);
              }}
              placeholder="0,00"
              className="font-mono mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sellDate" className="text-sm font-medium">Satış Tarihi</Label>
            <Input
              id="sellDate"
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex flex-col space-y-2 pt-4">
            <Button onClick={handleClose} className="w-full py-3">
              Pozisyonu Kapat
            </Button>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} className="w-full py-3">
              İptal
            </Button>
          </div>
        </div>
      </FullScreenModal>
    </>
  );
}
