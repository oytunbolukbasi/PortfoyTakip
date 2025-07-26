import { Position } from "@shared/schema";

interface PortfolioSummaryProps {
  positions: Position[];
}

export default function PortfolioSummary({ positions }: PortfolioSummaryProps) {
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
    <section className="p-4 bg-surface shadow-sm border-b border-gray-200">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-text-secondary text-sm">Toplam Değer</p>
          <p className="font-mono text-xl font-medium text-text-primary">
            ₺{summary.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-text-secondary text-sm">Günlük P/L</p>
          <p className={`font-mono text-xl font-medium ${
            summary.dailyPL >= 0 ? 'text-success' : 'text-error'
          }`}>
            {summary.dailyPL >= 0 ? '+' : ''}₺{Math.abs(summary.dailyPL).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      <div className="mt-4 bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-secondary text-sm">Toplam Getiri</span>
          <span className={`font-mono text-sm font-medium ${
            summary.totalReturn >= 0 ? 'text-success' : 'text-error'
          }`}>
            {summary.totalReturn >= 0 ? '+' : ''}{summary.totalReturn.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary text-sm">Toplam P/L</span>
          <span className={`font-mono text-sm font-medium ${
            summary.totalPL >= 0 ? 'text-success' : 'text-error'
          }`}>
            {summary.totalPL >= 0 ? '+' : ''}₺{Math.abs(summary.totalPL).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </section>
  );
}
