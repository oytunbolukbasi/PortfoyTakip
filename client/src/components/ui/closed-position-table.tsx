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
  const [sortField, setSortField] = useState<'symbol' | 'quantity' | 'buyPrice' | 'sellPrice' | 'totalReturn' | 'returnPercent' | 'sellDate'>('sellDate');
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
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'buyPrice':
        aValue = parseFloat(a.buyPrice);
        bValue = parseFloat(b.buyPrice);
        break;
      case 'sellPrice':
        aValue = parseFloat(a.sellPrice);
        bValue = parseFloat(b.sellPrice);
        break;
      case 'totalReturn':
        aValue = parseFloat(a.totalReturn);
        bValue = parseFloat(b.totalReturn);
        break;
      case 'returnPercent':
        aValue = parseFloat(a.returnPercent);
        bValue = parseFloat(b.returnPercent);
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
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Item count indicator */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            {closedPositions.length} kapalı pozisyon listeleniyor
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-3 py-3">
                  <SortButton field="symbol">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sembol</span>
                  </SortButton>
                </th>
                <th className="text-right px-3 py-3">
                  <SortButton field="quantity">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Adet</span>
                  </SortButton>
                </th>
                <th className="text-right px-3 py-3">
                  <SortButton field="buyPrice">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Alış</span>
                  </SortButton>
                </th>
                <th className="text-right px-3 py-3">
                  <SortButton field="sellPrice">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Satış</span>
                  </SortButton>
                </th>
                <th className="text-right px-3 py-3">
                  <SortButton field="totalReturn">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">K/Z</span>
                  </SortButton>
                </th>
                <th className="text-right px-3 py-3">
                  <SortButton field="sellDate">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Tarih</span>
                  </SortButton>
                </th>
                <th className="text-center px-3 py-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">İşlem</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPositions.map((position, index) => {
                const totalReturn = parseFloat(position.totalReturn);
                const returnPercent = parseFloat(position.returnPercent);

                return (
                  <tr 
                    key={position.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-25 dark:bg-gray-900/50'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {position.symbol}
                        </div>
                        {position.name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                            {position.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {position.quantity.toLocaleString('tr-TR')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {position.type === 'fund' 
                          ? formatFundPrice(parseFloat(position.buyPrice))
                          : `₺${formatTurkishPrice(parseFloat(position.buyPrice))}`
                        }
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {position.type === 'fund' 
                          ? formatFundPrice(parseFloat(position.sellPrice))
                          : `₺${formatTurkishPrice(parseFloat(position.sellPrice))}`
                        }
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-medium ${
                          totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {totalReturn >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(totalReturn))}
                        </span>
                        <span className={`text-xs ${
                          totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ({totalReturn >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(returnPercent))})
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(position.sellDate).toLocaleDateString('tr-TR')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePosition(position);
                        }}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {closedPositions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Henüz kapalı pozisyon bulunmuyor</p>
          </div>
        )}
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
              className="w-full bg-red-600 text-white hover:bg-red-700 py-3"
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
    </>
  );
}