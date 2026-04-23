import { ClosedPosition } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent, formatFundPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FullScreenModal } from './full-screen-modal';
import { apiRequest } from "@/lib/queryClient";

interface ClosedPositionTableProps {
  closedPositions: ClosedPosition[];
  onRefresh: () => void;
}

export function ClosedPositionTable({ closedPositions, onRefresh }: ClosedPositionTableProps) {
  const [sortField, setSortField] = useState<'symbol' | 'quantity' | 'buyPrice' | 'sellPrice' | 'pl' | 'plPercent' | 'sellDate'>('sellDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deletePosition, setDeletePosition] = useState<ClosedPosition | null>(null);
  const { toast } = useToast();

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPositions = [...closedPositions].sort((a, b) => {
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
      case 'sellPrice':
        aValue = parseFloat(a.sellPrice);
        bValue = parseFloat(b.sellPrice);
        break;
      case 'pl':
        aValue = parseFloat(a.pl);
        bValue = parseFloat(b.pl);
        break;
      case 'plPercent':
        aValue = parseFloat(a.plPercent);
        bValue = parseFloat(b.plPercent);
        break;
      case 'sellDate':
        aValue = new Date(a.sellDate).getTime();
        bValue = new Date(b.sellDate).getTime();
        break;
      default:
        aValue = a.symbol;
        bValue = b.symbol;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDelete = async (position: ClosedPosition) => {
    try {
      await apiRequest('DELETE', `/api/closed-positions/${position.id}`);
      onRefresh();
      setDeletePosition(null);
      toast({
        title: "Kapalı pozisyon silindi",
        description: `${position.symbol} kapalı pozisyonu başarıyla silindi.`,
      });
    } catch (error) {
      toast({
        title: "Silme hatası",
        description: "Pozisyon silinirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const SortButton = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </Button>
  );

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border mx-4 mb-3 overflow-hidden">
      {/* Item count indicator */}
      <div className="px-4 py-2 bg-subtle border-b border-border">
        <p className="text-xs text-text-secondary font-medium">
          {closedPositions.length} kapalı pozisyon listeleniyor
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-subtle">
            <tr>
              <th className="sticky left-0 bg-subtle px-3 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[120px] z-10 border-r border-border">
                <SortButton field="symbol">Varlık</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[70px]">
                <SortButton field="quantity">Adet</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[90px]">
                <SortButton field="buyPrice">Alış</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[90px]">
                <SortButton field="sellPrice">Satış</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[80px]">
                <SortButton field="pl">K/Z</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[70px]">
                <SortButton field="plPercent">K/Z %</SortButton>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[90px]">
                <SortButton field="sellDate">Tarih</SortButton>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider min-w-[80px]">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {sortedPositions.map((position) => {
              const pl = parseFloat(position.pl);
              const plPercent = parseFloat(position.plPercent);

              return (
                <tr
                  key={position.id}
                  className="hover:bg-subtle transition-colors"
                >
                  <td className="sticky left-0 bg-card px-3 py-4 border-r border-border z-10">
                    <div className="flex items-center space-x-3 min-w-[120px]">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {position.symbol}
                        </div>
                        {position.name && (
                          <div className="text-xs text-text-secondary truncate">
                            {position.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-sm text-text-primary font-medium">
                      {parseFloat(position.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 10 })}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-sm text-text-primary">
                      {position.type === 'fund'
                        ? formatFundPrice(parseFloat(position.buyPrice))
                        : `₺${formatTurkishPrice(parseFloat(position.buyPrice))}`
                      }
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-sm text-text-primary">
                      {position.type === 'fund'
                        ? formatFundPrice(parseFloat(position.sellPrice))
                        : `₺${formatTurkishPrice(parseFloat(position.sellPrice))}`
                      }
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={`text-sm font-medium ${
                      pl >= 0 ? 'text-success-500' : 'text-error-500'
                    }`}>
                      {pl >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(pl))}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={`text-sm font-medium ${
                      plPercent >= 0 ? 'text-success-500' : 'text-error-500'
                    }`}>
                      {plPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(plPercent))}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-sm text-text-secondary">
                      {new Date(position.sellDate).toLocaleDateString('tr-TR')}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePosition(position);
                      }}
                      className="h-8 w-8 p-0 text-text-tertiary hover:text-error-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            
            {closedPositions.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <p className="text-text-secondary">Henüz kapalı pozisyon bulunmuyor</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      {deletePosition && (
        <FullScreenModal 
          open={true} 
          onOpenChange={() => setDeletePosition(null)}
          title="Kapalı Pozisyonu Sil"
          description={`${deletePosition.symbol} kapalı pozisyonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        >
          <div className="flex flex-col space-y-2 mt-6">
            <Button 
              onClick={() => handleDelete(deletePosition)}
              className="w-full bg-error-500 text-white hover:opacity-90 py-3"
            >
              Evet, Sil
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDeletePosition(null)} 
              className="w-full py-3"
            >
              İptal
            </Button>
          </div>
        </FullScreenModal>
      )}
    </div>
  );
}