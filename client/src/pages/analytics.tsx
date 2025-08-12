import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, ClosedPosition } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { formatTurkishPrice, formatTurkishPercent } from "@/lib/format";

export default function Analytics() {
  const { theme, toggleTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'all' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
  });

  const { data: closedPositions = [], isLoading: closedLoading } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter positions based on selected date range
  const getFilteredData = () => {
    let filteredClosed = [];
    let filteredActive = [];
    
    if (timeRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      // Filter closed positions by sell date within range
      filteredClosed = closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= start && sellDate <= end;
      });
      
      // Filter active positions by buy date within range (for portfolio metrics)
      filteredActive = positions.filter(position => {
        const buyDate = new Date(position.buyDate);
        return buyDate >= start && buyDate <= end;
      });
      
    } else if (timeRange === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter closed positions sold today
      filteredClosed = closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= today && sellDate < tomorrow;
      });
      
      // Filter active positions bought today
      filteredActive = positions.filter(position => {
        const buyDate = new Date(position.buyDate);
        return buyDate >= today && buyDate < tomorrow;
      });
      
    } else if (timeRange === 'monthly') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Filter closed positions sold this month
      filteredClosed = closedPositions.filter(position => {
        const sellDate = new Date(position.sellDate);
        return sellDate >= startOfMonth && sellDate <= endOfMonth;
      });
      
      // Filter active positions bought this month
      filteredActive = positions.filter(position => {
        const buyDate = new Date(position.buyDate);
        return buyDate >= startOfMonth && buyDate <= endOfMonth;
      });
    } else if (timeRange === 'all') {
      // Return all data
      filteredClosed = closedPositions;
      filteredActive = positions;
    }
    
    return { filteredClosed, filteredActive };
  };

  const { filteredClosed: filteredClosedPositions, filteredActive: filteredActivePositions } = getFilteredData();

  // Calculate portfolio metrics for filtered period
  const filteredTotalValue = filteredActivePositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice || '0') * pos.quantity);
  }, 0);

  const filteredTotalCost = filteredActivePositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.buyPrice) * pos.quantity);
  }, 0);

  const filteredProfit = filteredTotalValue - filteredTotalCost;
  
  // Overall portfolio metrics (all positions)
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

  // Asset type analysis
  const stockPositions = positions.filter(pos => pos.type === 'stock');
  const fundPositions = positions.filter(pos => pos.type === 'fund');
  
  const stockValue = stockPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice || '0') * pos.quantity);
  }, 0);
  
  const stockCost = stockPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.buyPrice) * pos.quantity);
  }, 0);
  
  const stockPL = stockValue - stockCost;
  
  const fundValue = fundPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice || '0') * pos.quantity);
  }, 0);
  
  const fundCost = fundPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.buyPrice) * pos.quantity);
  }, 0);
  
  const fundPL = fundValue - fundCost;
  
  // Asset allocation percentages
  const stockPercentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const fundPercentage = totalValue > 0 ? (fundValue / totalValue) * 100 : 0;

  const isLoading = positionsLoading || closedLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-foreground">Analiz</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-3 text-primary hover:bg-primary/10 rounded-full"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
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
            variant={timeRange === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('all')}
            className="flex-1"
          >
            Tümü
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
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs font-medium text-gray-600 dark:text-gray-400 block">Başlangıç Tarihi</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                  max={endDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs font-medium text-gray-600 dark:text-gray-400 block">Bitiş Tarihi</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                  min={startDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            {startDate && endDate && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  <CalendarDays className="w-4 h-4 inline mr-2" />
                  Seçili Dönem: {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  • {filteredActivePositions.length} pozisyon açıldı • {filteredClosedPositions.length} pozisyon kapatıldı
                </p>
              </div>
            )}
          </div>
        )}
        
        {timeRange === 'all' && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Tüm Veriler: {positions.length} aktif pozisyon, {closedPositions.length} kapalı pozisyon
            </p>
          </div>
        )}
        
        {timeRange === 'daily' && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Bugün: {filteredActivePositions.length} pozisyon açıldı, {filteredClosedPositions.length} pozisyon kapatıldı
            </p>
          </div>
        )}
        
        {timeRange === 'monthly' && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
            <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Bu Ay: {filteredActivePositions.length} pozisyon açıldı, {filteredClosedPositions.length} pozisyon kapatıldı
            </p>
          </div>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="px-4 space-y-4 pb-32">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Portfolio Overview */}
            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Portföy Durumu
                  {timeRange === 'custom' && startDate && endDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Dönem: {filteredActivePositions.length} pozisyon)
                    </span>
                  )}
                  {timeRange === 'daily' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Bugün alınan: {filteredActivePositions.length})</span>
                  )}
                  {timeRange === 'monthly' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Bu ay alınan: {filteredActivePositions.length})</span>
                  )}
                </h3>
              </div>
              
              {/* Show filtered period data if custom date range is selected */}
              {timeRange === 'custom' && startDate && endDate ? (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dönem Değer</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(filteredTotalValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dönem Maliyet</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(filteredTotalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Dönem K/Z:</span>
                      <div className="text-right">
                        <span className={`font-bold ${filteredProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {filteredProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(filteredProfit))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Genel Portföy:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Değer</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Toplam K/Z</p>
                        <span className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(totalProfit))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Değer</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Maliyet</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Gerçekleşmemiş K/Z:</span>
                      <div className="text-right">
                        <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(totalProfit))}
                        </span>
                        <span className={`text-sm ml-2 ${totalProfitPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ({totalProfitPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(totalProfitPercent))})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Profit/Loss Summary */}
            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Kar/Zarar Özeti
                  {timeRange === 'custom' && startDate && endDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')})
                    </span>
                  )}
                  {timeRange === 'daily' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Bugün)</span>
                  )}
                  {timeRange === 'monthly' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Bu Ay)</span>
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Gerçekleşen K/Z {timeRange !== 'custom' || !startDate || !endDate ? '(Seçili Dönem)' : ''}:
                  </span>
                  <span className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {realizedProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(realizedProfit))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Gerçekleşmemiş K/Z:</span>
                  <span className={`font-semibold ${unrealizedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {unrealizedProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(unrealizedProfit))}
                  </span>
                </div>
                {timeRange === 'custom' && startDate && endDate && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Gerçekleşen K/Z:</span>
                    <span className={`font-semibold ${realizedProfitTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {realizedProfitTotal >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(realizedProfitTotal))}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {timeRange === 'custom' && startDate && endDate ? 'Dönem Kar/Zarar:' : 'Kar/Zarar:'}
                    </span>
                    <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {netProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(netProfit))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Performans Metrikleri
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aktif Pozisyon
                    {timeRange === 'custom' && startDate && endDate && ' (Genel)'}
                    {timeRange === 'daily' && ' (Genel)'}
                    {timeRange === 'monthly' && ' (Genel)'}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{positions.length}</p>
                  {(timeRange === 'custom' && startDate && endDate) || timeRange === 'daily' || timeRange === 'monthly' ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dönem: {filteredActivePositions.length}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Kapatılan Pozisyon
                    {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                    {timeRange === 'daily' && ' (Bugün)'}
                    {timeRange === 'monthly' && ' (Bu Ay)'}
                  </p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                    {filteredClosedPositions.length}
                  </p>
                  {timeRange === 'custom' && startDate && endDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Toplam: {closedPositions.length}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Kazanan İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {filteredClosedPositions.filter(p => parseFloat(p.pl) > 0).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Kaybeden İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {filteredClosedPositions.filter(p => parseFloat(p.pl) < 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Coming Soon - Charts */}


            {/* Asset Type P&L Analysis */}
            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Hisse & Fon Kar/Zarar
                </h3>
              </div>
              <div className="space-y-4">
                {/* Stock P&L */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900 dark:text-blue-200">Hisse Senedi</span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">{stockPositions.length} pozisyon</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400">Değer</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">₺{formatTurkishPrice(stockValue)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 dark:text-blue-400">K/Z</p>
                      <p className={`font-semibold ${stockPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stockPL >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(stockPL))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fund P&L */}
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900 dark:text-green-200">Fon</span>
                    <span className="text-sm text-green-700 dark:text-green-300">{fundPositions.length} pozisyon</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-green-600 dark:text-green-400">Değer</p>
                      <p className="font-semibold text-green-900 dark:text-green-100">₺{formatTurkishPrice(fundValue)}</p>
                    </div>
                    <div>
                      <p className="text-green-600 dark:text-green-400">K/Z</p>
                      <p className={`font-semibold ${fundPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {fundPL >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(fundPL))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Asset Allocation Chart */}
            <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Varlık Dağılımı
                </h3>
              </div>
              <div className="space-y-4">
                {/* Modern Half Donut Chart */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
                      {/* Background half circle */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        strokeWidth="16"
                        strokeLinecap="round"
                        className="stroke-gray-200 dark:stroke-gray-600"
                      />
                      
                      {/* Stock allocation arc */}
                      {stockPercentage > 0 && (
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${(stockPercentage / 100) * 251.3} 251.3`}
                          strokeDashoffset="0"
                          className="drop-shadow-sm stroke-blue-500 dark:stroke-blue-400"
                        />
                      )}
                      
                      {/* Fund allocation arc */}
                      {fundPercentage > 0 && (
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${(fundPercentage / 100) * 251.3} 251.3`}
                          strokeDashoffset={`${-(stockPercentage / 100) * 251.3}`}
                          className="drop-shadow-sm stroke-green-500 dark:stroke-green-400"
                        />
                      )}
                    </svg>
                    
                    {/* Center text - positioned better for half donut */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center mb-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Değer</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalValue)}</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Hisse Senedi</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatTurkishPercent(stockPercentage)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">₺{formatTurkishPrice(stockValue)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fon</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatTurkishPercent(fundPercentage)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">₺{formatTurkishPrice(fundValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}