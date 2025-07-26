import { useState } from "react";
import { Position } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PositionCardProps {
  position: Position;
  onRefresh: () => void;
}

export default function PositionCard({ position, onRefresh }: PositionCardProps) {
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

    try {
      await apiRequest('POST', `/api/positions/${position.id}/close`, {
        sellPrice,
        sellDate,
      });
      onRefresh();
      toast({
        title: "Pozisyon kapatıldı",
        description: `${position.symbol} pozisyonu başarıyla kapatıldı.`,
      });
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
      <div className="bg-surface rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                position.type === 'stock' ? 'bg-primary' : 'bg-secondary'
              }`}>
                <span className="text-white font-medium text-sm">
                  {position.symbol.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-text-primary">{position.symbol}</h3>
                <p className="text-sm text-text-secondary">{position.name || position.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-medium">₺{currentPrice.toFixed(2)}</p>
              <p className={`font-mono text-sm ${change >= 0 ? 'text-success' : 'text-error'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">{position.type === 'fund' ? 'Pay' : 'Adet'}</p>
              <p className="font-mono font-medium">{position.quantity.toLocaleString('tr-TR')}</p>
            </div>
            <div>
              <p className="text-text-secondary">Alış</p>
              <p className="font-mono font-medium">₺{parseFloat(position.buyPrice).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-text-secondary">Değer</p>
              <p className="font-mono font-medium">₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <div>
              <span className="text-text-secondary text-sm">P/L: </span>
              <span className={`font-mono text-sm font-medium ${pl >= 0 ? 'text-success' : 'text-error'}`}>
                {pl >= 0 ? '+' : ''}₺{Math.abs(pl).toFixed(0)}
              </span>
              <span className={`font-mono text-sm ml-1 ${plPercent >= 0 ? 'text-success' : 'text-error'}`}>
                ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 text-text-secondary hover:text-primary">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
                  Pozisyonu Kapat
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-error"
                >
                  Pozisyonu Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              {position.symbol} pozisyonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-error text-white hover:bg-error/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Position Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pozisyonu Kapat - {position.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sellPrice">Satış Fiyatı (₺)</Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="sellDate">Satış Tarihi</Label>
              <Input
                id="sellDate"
                type="date"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                İptal
              </Button>
              <Button onClick={handleClose}>
                Pozisyonu Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
