import { Position } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent, formatFundPrice, formatPositionPrice, formatPositionValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Check, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FullScreenModal } from './full-screen-modal';
import { EditPositionModal } from './edit-position-modal';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        aValue = parseFloat(a.quantity);
        bValue = parseFloat(b.quantity);
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
        aValue = aCurrentPrice * parseFloat(a.quantity);
        bValue = bCurrentPrice * parseFloat(b.quantity);
        break;
      case 'pl':
        const getPL = (p: Position) => {
          const bp = parseFloat(p.buyPrice);
          const cp = p.currentPrice ? parseFloat(p.currentPrice) : bp;
          // For sorting, we use TRY value of the USD gain at today's rate
          if (p.type === 'us_stock') {
            return (cp - bp) * parseFloat(p.quantity) * 35.0; // Use 35.0 as a stable sorting proxy
          }
          return (cp - bp) * parseFloat(p.quantity);
        };
        aValue = getPL(a);
        bValue = getPL(b);
        break;
      case 'plPercent':
        const getPLP = (p: Position) => {
          const bp = parseFloat(p.buyPrice);
          const cp = p.currentPrice ? parseFloat(p.currentPrice) : bp;
          return bp > 0 ? ((cp - bp) / bp) * 100 : 0;
        };
        aValue = getPLP(a);
        bValue = getPLP(b);
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
  const [showEditModal, setShowEditModal] = useState<{ show: boolean; position: Position | null }>({
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
      className="h-auto p-0 font-medium text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
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
    const quantity = parseFloat(position.quantity);
    const buyRate = parseFloat(position.buyRate || '1.0');
    
    // Native currency P/L
    const pl = (currentPrice - buyPrice) * quantity;
    const plPercent = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
    const value = currentPrice * quantity;
    
    // TRY P/L
    const usdRateMatch = document.body.innerText.match(/Kur: 1 USD = ₺([\d,]+)/);
    const usdRate = usdRateMatch ? parseFloat(usdRateMatch[1].replace(',', '.')) : 35.0;
    
    let plTRY = pl;
    if (position.type === 'us_stock') {
       plTRY = (currentPrice - buyPrice) * quantity * usdRate;
    }
    
    return { pl, plPercent, value, currentPrice, plTRY };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mx-4 mb-3 overflow-hidden">
      {/* Item count indicator */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {positions.length} aktif pozisyon listeleniyor
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[80px]" />  {/* Sticky Varlık */}
            <col className="w-[70px]" />  {/* Adet */}
            <col className="w-[110px]" /> {/* Alış */}
            <col className="w-[110px]" /> {/* Güncel */}
            <col className="w-[120px]" /> {/* Değer */}
            <col className="w-[110px]" /> {/* K/Z */}
            <col className="w-[80px]" />  {/* K/Z % */}
            <col className="w-[80px]" />  {/* İşlemler */}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="sticky left-0 bg-gray-50 dark:bg-gray-700/50 px-3 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider z-10 border-r border-gray-200 dark:border-gray-600">
                <SortButton field="symbol">Varlık</SortButton>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="quantity">Adet</SortButton></div>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="buyPrice">Alış</SortButton></div>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="currentPrice">Güncel</SortButton></div>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="value">Değer</SortButton></div>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="pl">K/Z</SortButton></div>
              </th>
              <th className="px-3 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex justify-end"><SortButton field="plPercent">K/Z %</SortButton></div>
              </th>
              <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPositions.map((position) => {
              const { pl, plPercent, value, currentPrice, plTRY } = calculatePL(position);
              
              return (
                <tr
                  key={position.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(position)}
                >
                  <td className="sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-3 py-5 z-10 border-r border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{position.symbol}</div>
                    {position.type === 'us_stock' && (
                      <div className="text-xs text-purple-500 dark:text-purple-400 font-medium tracking-wide">ABD</div>
                    )}
                  </td>
                  <td className="px-3 py-5 text-right text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {parseFloat(position.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 10 })}
                  </td>
                  <td className="px-3 py-5 text-right text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {formatPositionPrice(parseFloat(position.buyPrice), position.type)}
                  </td>
                  <td className="px-3 py-5 text-right text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {formatPositionPrice(currentPrice, position.type)}
                  </td>
                  <td className="px-3 py-5 text-right text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {formatPositionValue(value, position.type)}
                  </td>
                  <td className={`px-3 py-5 text-right text-sm font-medium whitespace-nowrap ${
                    plTRY >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {position.type === 'us_stock' ? (
                      <div className="flex flex-col items-end">
                        <span>{plTRY >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(plTRY))}</span>
                        <span className="text-[10px] opacity-60">({pl >= 0 ? '+' : '-'}${formatTurkishPrice(Math.abs(pl))})</span>
                      </div>
                    ) : (
                      <span>{pl >= 0 ? '+' : '-'}{formatPositionValue(Math.abs(pl), position.type)}</span>
                    )}
                  </td>
                  <td className={`px-3 py-5 text-right text-sm font-medium whitespace-nowrap ${
                    plPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {plPercent >= 0 ? '+' : ''}{formatTurkishPercent(plPercent)}
                  </td>
                  <td className="px-3 py-5 whitespace-nowrap text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="h-6 w-6" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEditModal({ show: true, position });
                          }}
                          className="flex items-center gap-3 cursor-pointer py-2.5"
                        >
                          <Pencil className="h-5 w-5 text-blue-500" />
                          <span className="text-sm font-medium">Pozisyonu Düzenle</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(position, e);
                          }}
                          className="flex items-center gap-3 cursor-pointer py-2.5"
                        >
                          <Check className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">Pozisyonu Kapat</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePosition(position, e);
                          }}
                          className="flex items-center gap-3 cursor-pointer py-2.5 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Pozisyonu Sil</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Close Position Modal */}
      <FullScreenModal 
        open={showCloseModal.show} 
        onOpenChange={(open) => setShowCloseModal({ show: open, position: null })}
        title={`Pozisyonu Kapat - ${showCloseModal.position?.symbol || ''}`}
        description="Seçili pozisyonu satış fiyatı girerek kapatın"
      >
        <div className="space-y-4">
                <div>
                  <Label htmlFor="sellPrice">Satış Fiyatı ({showCloseModal.position?.type === 'us_stock' ? '$' : '₺'})</Label>
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
      </FullScreenModal>

      {/* Edit Position Modal */}
      <EditPositionModal
        position={showEditModal.position}
        open={showEditModal.show}
        onOpenChange={(open) => setShowEditModal({ show: open, position: null })}
        onSuccess={() => {
          setShowEditModal({ show: false, position: null });
          onRefresh();
        }}
      />
    </div>
  );
}