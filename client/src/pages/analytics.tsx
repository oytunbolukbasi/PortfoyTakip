import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, ClosedPosition } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react";
import { formatTurkishPrice, formatTurkishPercent } from "@/lib/format";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
  });

  const { data: closedPositions = [], isLoading: closedLoading } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

  // Filter closed positions based on selected date range
  const getFilteredClosedPositions = () => {
    if (timeRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      return closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= start && sellDate <= end;
      });
    } else if (timeRange === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= today && sellDate < tomorrow;
      });
    } else if (timeRange === 'monthly') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= startOfMonth && sellDate <= endOfMonth;
      });
    }
    return closedPositions;
  };

  const filteredClosedPositions = getFilteredClosedPositions();

  // Calculate portfolio metrics
  const totalValue = positions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice || '0') * pos.quantity);
  }, 0);

  const totalCost = positions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.buyPrice) * pos.quantity);
  }, 0);

  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const realizedProfit = filteredClosedPositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.pl);
  }, 0);

  const realizedProfitTotal = closedPositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.pl);
  }, 0);

  const unrealizedProfit = totalProfit;
  const netProfit = realizedProfit + unrealizedProfit;
  const netProfitTotal = realizedProfitTotal + unrealizedProfit;

  const isLoading = positionsLoading || closedLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">Analiz</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-3 text-blue-600 hover:bg-blue-50 rounded-full"
          >
            <BarChart3 className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Time Range Selector */}
      <div className="px-4 py-4">
        <div className="flex space-x-2 mb-4">
          <Button
            variant={timeRange === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('daily')}
            className="flex-1"
          >
            Günlük
          </Button>
          <Button
            variant={timeRange === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('monthly')}
            className="flex-1"
          >
            Aylık
          </Button>
          <Button
            variant={timeRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('custom')}
            className="flex-1"
          >
            Özel
          </Button>
        </div>

        {timeRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium">Başlangıç</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
                max={endDate || undefined}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium">Bitiş</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
                min={startDate || undefined}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}
        
        {timeRange === 'custom' && startDate && endDate && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Seçili dönem: {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
              ({filteredClosedPositions.length} işlem)
            </p>
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Portfolio Overview */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Portföy Durumu
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Toplam Değer</p>
                  <p className="text-xl font-bold text-gray-900">₺{formatTurkishPrice(totalValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Toplam Maliyet</p>
                  <p className="text-xl font-bold text-gray-900">₺{formatTurkishPrice(totalCost)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gerçekleşmemiş K/Z:</span>
                  <div className="text-right">
                    <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalProfit >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(totalProfit))}
                    </span>
                    <span className={`text-sm ml-2 ${totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({totalProfitPercent >= 0 ? '+' : ''}{formatTurkishPercent(totalProfitPercent)})
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Profit/Loss Summary */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Percent className="w-5 h-5 mr-2 text-green-600" />
                  Kar/Zarar Özeti
                  {timeRange === 'custom' && startDate && endDate && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')})
                    </span>
                  )}
                  {timeRange === 'daily' && (
                    <span className="text-xs text-gray-500 ml-2">(Bugün)</span>
                  )}
                  {timeRange === 'monthly' && (
                    <span className="text-xs text-gray-500 ml-2">(Bu Ay)</span>
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Gerçekleşen K/Z {timeRange !== 'custom' || !startDate || !endDate ? '(Seçili Dönem)' : ''}:
                  </span>
                  <span className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realizedProfit >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(realizedProfit))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gerçekleşmemiş K/Z:</span>
                  <span className={`font-semibold ${unrealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {unrealizedProfit >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(unrealizedProfit))}
                  </span>
                </div>
                {timeRange === 'custom' && startDate && endDate && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Toplam Gerçekleşen K/Z:</span>
                    <span className={`font-semibold ${realizedProfitTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {realizedProfitTotal >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(realizedProfitTotal))}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {timeRange === 'custom' && startDate && endDate ? 'Dönem Net K/Z:' : 'Net K/Z:'}
                    </span>
                    <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netProfit >= 0 ? '+' : ''}₺{formatTurkishPrice(Math.abs(netProfit))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Performans Metrikleri
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Aktif Pozisyon</p>
                  <p className="text-2xl font-bold text-blue-600">{positions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Kapatılan Pozisyon
                    {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                    {timeRange === 'daily' && ' (Bugün)'}
                    {timeRange === 'monthly' && ' (Bu Ay)'}
                  </p>
                  <p className="text-2xl font-bold text-gray-600">
                    {timeRange === 'custom' && startDate && endDate ? filteredClosedPositions.length : closedPositions.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Kazanan İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {filteredClosedPositions.filter(p => parseFloat(p.pl) > 0).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Kaybeden İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-red-600">
                      {filteredClosedPositions.filter(p => parseFloat(p.pl) < 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Coming Soon - Charts */}
            <Card className="p-6">
              <div className="text-center">
                <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Gelişmiş Analizler</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Zaman bazlı grafik analizleri, performans karşılaştırmaları ve detaylı raporlar yakında eklenecek.
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>Grafik Görünümü</span>
                  <span>•</span>
                  <TrendingDown className="w-4 h-4" />
                  <span>Trend Analizi</span>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}