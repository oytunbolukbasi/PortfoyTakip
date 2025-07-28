import { Position } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Drawer } from "vaul";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PositionTableProps {
  positions: Position[];
  onRowClick: (position: Position) => void;
  onRefresh: () => void;
}

export function PositionTable({ positions, onRowClick, onRefresh }: PositionTableProps) {
  const [sortField, setSortField] = useState<'symbol' | 'quantity' | 'buyPrice' | 'currentPrice' | 'value' | 'pl' | 'plPercent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPositions = [...positions].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'buyPrice':
        aValue = parseFloat(a.buyPrice);
        bValue = parseFloat(b.buyPrice);
        break;
      case 'currentPrice':
        aValue = a.currentPrice ? parseFloat(a.currentPrice) : parseFloat(a.buyPrice);
        bValue = b.currentPrice ? parseFloat(b.currentPrice) : parseFloat(b.buyPrice);
        break;
      case 'value':
        const aCurrentPrice = a.currentPrice ? parseFloat(a.currentPrice) : parseFloat(a.buyPrice);
        const bCurrentPrice = b.currentPrice ? parseFloat(b.currentPrice) : parseFloat(b.buyPrice);
        aValue = aCurrentPrice * a.quantity;
        bValue = bCurrentPrice * b.quantity;
        break;
      case 'pl':
        const aPL = (a.currentPrice ? parseFloat(a.currentPrice) : parseFloat(a.buyPrice) - parseFloat(a.buyPrice)) * a.quantity;
        const bPL = (b.currentPrice ? parseFloat(b.currentPrice) : parseFloat(b.buyPrice) - parseFloat(b.buyPrice)) * b.quantity;
        aValue = aPL;
        bValue = bPL;
        break;
      case 'plPercent':
        const aPLPercent = a.currentPrice ? ((parseFloat(a.currentPrice) - parseFloat(a.buyPrice)) / parseFloat(a.buyPrice)) * 100 : 0;
        const bPLPercent = b.currentPrice ? ((parseFloat(b.currentPrice) - parseFloat(b.buyPrice)) / parseFloat(b.buyPrice)) * 100 : 0;
        aValue = aPLPercent;
        bValue = bPLPercent;
        break;
      default:
        return 0;
    }
    
    if (typeof aValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const [showCloseModal, setShowCloseModal] = useState<{ show: boolean; position: Position | null }>({
    show: false,
    position: null,
  });
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);

  const handleClosePosition = async (position: Position, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCloseModal({ show: true, position });
    setSellPrice(position.currentPrice ? parseFloat(position.currentPrice).toFixed(2).replace('.', ',') : '0,00');
  };

  const handleConfirmClose = async () => {
    if (!showCloseModal.position || !sellPrice) {
      toast({
        title: "Hata",
        description: "Satış fiyatı girmelisiniz.",
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
      const closeData = {
        sellPrice: numericPrice.toString(),
        sellDate,
      };

      const response = await fetch(`/api/positions/${showCloseModal.position.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closeData),
      });

      if (!response.ok) {
        throw new Error('Pozisyon kapatma başarısız');
      }

      toast({
        title: "Pozisyon Kapatıldı",
        description: `${showCloseModal.position.symbol} pozisyonu başarıyla kapatıldı`,
      });

      setShowCloseModal({ show: false, position: null });
      setSellPrice('');
      onRefresh();
      
      // Auto-refresh closed positions  
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshClosedPositions'));
      }, 1000);
    } catch (error) {
      console.error('Close position error:', error);
      toast({
        title: "Hata",
        description: "Pozisyon kapatılırken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDeletePosition = async (position: Position, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/positions/${position.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Pozisyon silme başarısız');
      }

      toast({
        title: "Pozisyon Silindi",
        description: `${position.symbol} pozisyonu başarıyla silindi`,
      });

      onRefresh();
    } catch (error) {
      console.error('Delete position error:', error);
      toast({
        title: "Hata",
        description: "Pozisyon silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const SortButton = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </Button>
  );
  const calculatePL = (position: Position) => {
    const buyPrice = parseFloat(position.buyPrice);
    const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
    const quantity = position.quantity;
    
    const pl = (currentPrice - buyPrice) * quantity;
    const plPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
    const value = currentPrice * quantity;
    
    return { pl, plPercent, value, currentPrice };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-3 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] z-10 border-r border-gray-200">
                <SortButton field="symbol">Varlık</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">
                <SortButton field="quantity">Adet</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
                <SortButton field="buyPrice">Alış</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
                <SortButton field="currentPrice">Güncel</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                <SortButton field="value">Değer</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                <SortButton field="pl">K/Z</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">
                <SortButton field="plPercent">K/Z %</SortButton>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPositions.map((position) => {
              const { pl, plPercent, value, currentPrice } = calculatePL(position);
              
              return (
                <tr
                  key={position.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(position)}
                >
                  <td className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-4 whitespace-nowrap z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                        position.type === 'stock' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        <span className="text-white font-semibold text-xs">
                          {position.symbol.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{position.symbol}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[80px]">
                          {position.name || position.symbol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {position.quantity.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ₺{formatTurkishPrice(parseFloat(position.buyPrice))}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ₺{formatTurkishPrice(currentPrice)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatTurkishCurrency(value)}
                  </td>
                  <td className={`px-3 py-4 whitespace-nowrap text-right text-sm font-medium ${
                    pl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
                  </td>
                  <td className={`px-3 py-4 whitespace-nowrap text-right text-sm font-medium ${
                    plPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {plPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full"
                        onClick={(e) => handleClosePosition(position, e)}
                        title="Pozisyonu Kapat"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-full"
                        onClick={(e) => handleDeletePosition(position, e)}
                        title="Pozisyonu Sil"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Close Position Bottom Sheet */}
      <Drawer.Root open={showCloseModal.show} onOpenChange={(open) => setShowCloseModal({ show: open, position: null })}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[60%] mt-24 fixed bottom-0 left-0 right-0">
            <div className="p-4 bg-white rounded-t-[10px] flex-1 pb-safe-area-inset-bottom">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
              <div className="text-center pb-4">
                <Drawer.Title className="text-lg font-semibold">
                  Pozisyonu Kapat - {showCloseModal.position?.symbol}
                </Drawer.Title>
              </div>
              <div className="space-y-4 drawer-content">
                <div>
                  <Label htmlFor="sellPrice">Satış Fiyatı (₺)</Label>
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
                <div className="flex flex-col space-y-2 pt-4">
                  <Button onClick={handleConfirmClose} className="w-full py-3">
                    Pozisyonu Kapat
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCloseModal({ show: false, position: null })}
                    className="w-full py-3"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}