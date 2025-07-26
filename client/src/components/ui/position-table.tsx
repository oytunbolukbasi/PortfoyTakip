import { Position } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPrice, formatTurkishPercent } from "@/lib/format";

interface PositionTableProps {
  positions: Position[];
  onRowClick: (position: Position) => void;
}

export function PositionTable({ positions, onRowClick }: PositionTableProps) {
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
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] z-10 border-r border-gray-200">
                Varlık
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">
                Adet
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
                Alış
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
                Güncel
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Değer
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                K/Z
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">
                K/Z %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positions.map((position) => {
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
                    ₺{formatTurkishPrice(position.buyPrice)}
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
                    {pl >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(pl))}
                  </td>
                  <td className={`px-3 py-4 whitespace-nowrap text-right text-sm font-medium ${
                    plPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTurkishPercent(plPercent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}