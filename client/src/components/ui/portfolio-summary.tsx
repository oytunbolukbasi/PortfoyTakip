import { useState } from "react";
import { Position, ClosedPosition } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPercent, formatTurkishPrice, formatFundPrice, formatPositionValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowRightLeft, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
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
    let missingPriceCount = 0;

    // Active positions
    positions.forEach((position) => {
      const quantity = parseFloat(position.quantity);
      const buyPrice = parseFloat(position.buyPrice);
      
      let currentPrice: number;
      if (position.currentPrice === null || position.currentPrice === undefined) {
        currentPrice = buyPrice;
        missingPriceCount++;
      } else {
        currentPrice = parseFloat(position.currentPrice);
      }
      
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
        const quantity = parseFloat(pos.quantity);
        
        const usdGain = (sellPrice - buyPrice) * quantity;
        const realizedPL_TRY = usdGain * usdRate;
        
        realizedPL += realizedPL_TRY;
        realizedCost += buyPrice * quantity * usdRate;
      } else {
        realizedPL += parseFloat(pos.pl);
        realizedCost += parseFloat(pos.buyPrice) * parseFloat(pos.quantity);
      }
    });

    const netPL = (totalValue - totalCost) + realizedPL;
    // Lifetime total cost = Active cost + Cost of closed positions
    // This gives a more accurate percentage of overall return
    const lifetimeCost = totalCost + realizedCost;
    const totalReturnPercent = lifetimeCost > 0 ? (netPL / lifetimeCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPL: netPL,
      totalReturn: totalReturnPercent,
      missingPriceCount,
    };
  };

  const rawSummary = calculateSummary();
  
  const isUSD = displayCurrency === 'USD';
  const summary = {
    totalValue: isUSD ? rawSummary.totalValue / usdRate : rawSummary.totalValue,
    totalCost: isUSD ? rawSummary.totalCost / usdRate : rawSummary.totalCost,
    totalPL: isUSD ? rawSummary.totalPL / usdRate : rawSummary.totalPL,
    totalReturn: rawSummary.totalReturn, // Return is a percentage, stays same
  };

  const fmtCurrency = (val: number) => {
    const formatted = val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isUSD ? `$${formatted}` : `₺${formatted}`;
  };

  return (
    <section className="mx-4 mt-3 mb-4">
      {/* Main Portfolio Value Card */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-text-primary">Portföy Değeri</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="p-1 h-auto text-text-secondary hover:text-text-primary"
            >
              {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-4xl font-bold text-text-primary">
              {isVisible ? fmtCurrency(summary.totalValue) : "***.***.***,**"}
            </p>
            <button
              onClick={() => setDisplayCurrency(prev => prev === 'TRY' ? 'USD' : 'TRY')}
              className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-subtle"
              title="Para birimini değiştir"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-subtle rounded-xl border border-border">
            <p className="text-sm text-text-secondary mb-1">Toplam Getiri</p>
            <p className={`text-lg font-semibold ${
              summary.totalReturn >= 0 ? 'text-success-500' : 'text-error-500'
            }`}>
              {isVisible ? `${summary.totalReturn >= 0 ? '+' : '-'}${formatTurkishPercent(Math.abs(summary.totalReturn))}` : "**,**%"}
            </p>
          </div>
          <div className="text-center p-4 bg-subtle rounded-xl border border-border">
            <p className="text-sm text-text-secondary mb-1">Net K/Z</p>
            <p className={`text-lg font-semibold ${
              summary.totalPL >= 0 ? 'text-success-500' : 'text-error-500'
            }`}>
              {isVisible
                ? `${summary.totalPL >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(summary.totalPL))}`
                : "***.***.***,**"
              }
            </p>
          </div>
        </div>
        
        {/* Missing Price Warning */}
        {rawSummary.missingPriceCount > 0 && (
          <div className="mt-4 p-3 bg-warning-50 border border-warning-100 rounded-xl flex items-center gap-2 text-warning-600 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>
              {rawSummary.missingPriceCount} varlığın güncel fiyatı alınamadı. Hesaplamalar maliyet üzerinden yapılıyor.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
