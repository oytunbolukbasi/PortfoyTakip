import { useState } from "react";
import { Position } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent, parseTurkishPrice } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer } from "vaul";
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                position.type === 'stock' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                <span className="text-white font-semibold text-sm">
                  {position.symbol.substring(0, 3).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{position.symbol}</h3>
                <p className="text-sm text-gray-500">{position.name || position.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">₺{formatTurkishPrice(currentPrice)}</p>
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
              <p className="font-semibold text-gray-900">₺{formatTurkishPrice(position.buyPrice)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Değer</p>
              <p className="font-semibold text-gray-900">{formatTurkishCurrency(value)}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">K/Z:</span>
              <span className={`font-semibold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
              </span>
              <span className={`text-sm ${plPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({plPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onClick?.()}
                className="px-3 py-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                Düzenle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCloseDialog(true);
                  setSellPrice(position.currentPrice ? parseFloat(position.currentPrice).toFixed(2).replace('.', ',') : '0,00');
                  setSellDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-3 py-1 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                Kapat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                className="px-3 py-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Bottom Sheet */}
      <Drawer.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[40%] mt-24 fixed bottom-0 left-0 right-0">
            <div className="p-4 bg-white rounded-t-[10px] flex-1">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
              <div className="text-center pb-4">
                <Drawer.Title className="text-lg font-semibold">Pozisyonu Sil</Drawer.Title>
                <p className="text-gray-600 mt-2">
                  {position.symbol} pozisyonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
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
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Close Position Bottom Sheet */}
      <Drawer.Root open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[60%] mt-24 fixed bottom-0 left-0 right-0">
            <div className="p-4 bg-white rounded-t-[10px] flex-1">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
              <div className="text-center pb-4">
                <Drawer.Title className="text-lg font-semibold">Pozisyonu Kapat</Drawer.Title>
                <p className="text-sm text-gray-600">{position.symbol}</p>
              </div>
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
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
