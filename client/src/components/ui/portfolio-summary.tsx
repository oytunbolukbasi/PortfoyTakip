import { useState } from "react";
import { Position } from "@shared/schema";
import { formatTurkishCurrency, formatTurkishPercent, formatTurkishPrice, formatFundPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface PortfolioSummaryProps {
  positions: Position[];
}

export default function PortfolioSummary({ positions }: PortfolioSummaryProps) {
  const [isVisible, setIsVisible] = useState(true);
  const calculateSummary = () => {
    let totalValue = 0;
    let totalCost = 0;
    let dailyPL = 0;

    positions.forEach((position) => {
      const quantity = position.quantity;
      const buyPrice = parseFloat(position.buyPrice);
      const currentPrice = position.currentPrice ? parseFloat(position.currentPrice) : buyPrice;
      
      const positionValue = currentPrice * quantity;
      const positionCost = buyPrice * quantity;
      
      totalValue += positionValue;
      totalCost += positionCost;
    });

    const totalPL = totalValue - totalCost;
    const totalReturn = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    
    // Daily P/L would require previous day prices - using mock for now
    dailyPL = totalPL * 0.1; // Mock 10% of total P/L as daily change

    return {
      totalValue,
      totalCost,
      totalPL,
      totalReturn,
      dailyPL,
    };
  };

  const summary = calculateSummary();

  return (
    <section className="mx-4 mt-3 mb-4">
      {/* Main Portfolio Value Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Portföy Değeri</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(!isVisible)}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {isVisible ? formatTurkishCurrency(summary.totalValue) : "***.***.***,**"}
          </p>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            summary.dailyPL >= 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isVisible 
              ? `${summary.dailyPL >= 0 ? '+' : '-'}₺${formatTurkishPrice(Math.abs(summary.dailyPL))} bugün`
              : "***,** bugün"
            }
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Toplam Getiri</p>
            <p className={`text-lg font-semibold ${
              summary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {isVisible ? `${summary.totalReturn >= 0 ? '+' : '-'}${formatTurkishPercent(Math.abs(summary.totalReturn))}` : "**,**%"}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Net K/Z</p>
            <p className={`text-lg font-semibold ${
              summary.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {isVisible 
                ? `${summary.totalPL >= 0 ? '+' : '-'}₺${formatTurkishPrice(Math.abs(summary.totalPL))}`
                : "***.***.***,**"
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
