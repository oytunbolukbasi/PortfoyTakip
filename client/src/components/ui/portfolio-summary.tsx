import { useState } from "react";
import { Position, ClosedPosition } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPercent, formatTurkishPrice, formatFundPrice, formatPositionValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PortfolioSummaryProps {
  positions: Position[];
  closedPositions?: ClosedPosition[];
}

export default function PortfolioSummary({ positions, closedPositions = [] }: PortfolioSummaryProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<'TRY' | 'USD'>('TRY');
  
  const { data: exchangeRateData } = useQuery<{pair: string; rate: number}>({
    queryKey: ['/api/exchange-rates', 'USDTRY'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rates?pair=USDTRY');
      return res.json();
    },
  });
  const usdRate = exchangeRateData?.rate || 35.0;

  const calculateSummary = () => {
    let totalValue = 0;
    let totalCost = 0;
    let realizedPL = 0;
    let realizedCost = 0;

    // Active positions
    positions.forEach((position) => {
      const quantity = position.quantity;
      const buyPrice = parseFloat(position.buyPrice);
      const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
      const buyRate = parseFloat(position.buyRate || '1.0');
      
      if (position.type === 'us_stock') {
        const positionValueTRY = currentPrice * quantity * usdRate;
        // Total Cost (TRY) is calculated using current rate to isolate USD profit
        const positionCostTRY = buyPrice * quantity * usdRate;
        totalValue += positionValueTRY;
        totalCost += positionCostTRY;
      } else {
        totalValue += currentPrice * quantity;
        totalCost += buyPrice * quantity;
      }
    });

    // Closed positions (Realized)
    closedPositions.forEach((pos) => {
      const buyRate = parseFloat(pos.buyRate || '1.0');
      const rate = pos.type === 'us_stock' ? usdRate : 1;
      
      if (pos.type === 'us_stock') {
        // Realized P/L in TRY = USD Gain * Current Rate (as per user request for current view)
        const sellPrice = parseFloat(pos.sellPrice);
        const buyPrice = parseFloat(pos.buyPrice);
        const quantity = pos.quantity;
        
        const usdGain = (sellPrice - buyPrice) * quantity;
        const realizedPL_TRY = usdGain * usdRate;
        
        realizedPL += realizedPL_TRY;
        realizedCost += buyPrice * quantity * usdRate;
      } else {
        realizedPL += parseFloat(pos.pl);
        realizedCost += parseFloat(pos.buyPrice) * pos.quantity;
      }
    });

    const netPL = (totalValue - totalCost) + realizedPL;
    // Lifetime total cost = Active cost + Cost of closed positions
    // This gives a more accurate percentage of overall return
    const lifetimeCost = totalCost + realizedCost;
    const totalReturnPercent = lifetimeCost > 0 ? (netPL / lifetimeCost) * 100 : 0;
    
    // For "daily change", we keep it simple for now as 0 or 
    // we could try to get it if we had a more robust historical data system.
    // Removing the 10% mock to avoid total confusion.
    const dailyChange = 0; 

    return {
      totalValue,
      totalCost,
      totalPL: netPL,
      totalReturn: totalReturnPercent,
      dailyPL: dailyChange,
    };
  };

  const rawSummary = calculateSummary();
  
  const isUSD = displayCurrency === 'USD';
  const summary = {
    totalValue: isUSD ? rawSummary.totalValue / usdRate : rawSummary.totalValue,
    totalCost: isUSD ? rawSummary.totalCost / usdRate : rawSummary.totalCost,
    totalPL: isUSD ? rawSummary.totalPL / usdRate : rawSummary.totalPL,
    totalReturn: rawSummary.totalReturn, // Return is a percentage, stays same
    dailyPL: isUSD ? rawSummary.dailyPL / usdRate : rawSummary.dailyPL,
  };

  const fmtCurrency = (val: number) => {
    const formatted = val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isUSD ? `$${formatted}` : `₺${formatted}`;
  };

  return (
    <section className="mx-4 mt-3 mb-4">
      {/* Main Portfolio Value Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portföy Değeri</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="p-1 h-auto text-muted-foreground hover:text-foreground"
            >
              {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-4xl font-bold text-gray-900 dark:text-white">
              {isVisible ? fmtCurrency(summary.totalValue) : "***.***.***,**"}
            </p>
            <button
              onClick={() => setDisplayCurrency(prev => prev === 'TRY' ? 'USD' : 'TRY')}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Para birimini değiştir"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            summary.dailyPL >= 0 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
          }`}>
            {isVisible 
              ? summary.dailyPL === 0 
                ? 'Bugün değişim yok'
                : `${summary.dailyPL >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(summary.dailyPL))} bugün`
              : "***,** bugün"
            }
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Toplam Getiri</p>
            <p className={`text-lg font-semibold ${
              summary.totalReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isVisible ? `${summary.totalReturn >= 0 ? '+' : '-'}${formatTurkishPercent(Math.abs(summary.totalReturn))}` : "**,**%"}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Net K/Z</p>
            <p className={`text-lg font-semibold ${
              summary.totalPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isVisible 
                ? `${summary.totalPL >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(summary.totalPL))}`
                : "***.***.***,**"
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
