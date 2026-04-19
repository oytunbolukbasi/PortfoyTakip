import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Position, ClosedPosition, AiChatHistory } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Moon, Sun, Send, Loader2, History, ChevronRight, Metadata, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { formatTurkishPrice, formatTurkishPercent } from "@/lib/format";
import { LuSparkles } from "react-icons/lu";
import { Drawer } from "vaul";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Analytics() {
  const { theme, toggleTheme } = useTheme();
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'all' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
  });

  const { data: aiHistory = [], isLoading: historyLoading } = useQuery<AiChatHistory[]>({
    queryKey: ['/api/ai/history'],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (message?: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze", { message });
      return res.json() as Promise<AiChatHistory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/history'] });
      setAiMessage("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Analiz yapılamadı",
      });
    }
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ai/history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/history'] });
      toast({
        title: "Başarılı",
        description: "Sohbet geçmişi temizlendi",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Geçmiş silinemedi",
      });
    }
  });

  const handleAiAnalyze = () => {
    setIsAiDrawerOpen(true);
    if (aiHistory.length === 0) {
      analyzeMutation.mutate();
    }
  };

  // Keyboard and Viewport handling for iOS PWA
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAiDrawerOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [aiHistory.length, isAiDrawerOpen, viewportHeight]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || analyzeMutation.isPending) return;
    analyzeMutation.mutate(aiMessage);
  };

  const { data: closedPositions = [], isLoading: closedLoading } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

  const { data: exchangeRateData } = useQuery<{ pair: string; rate: number }>({
    queryKey: ['/api/exchange-rates', 'USDTRY'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rates?pair=USDTRY');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  const usdRate = exchangeRateData?.rate || 35.0;

  const toTRY = (val: string | number, type: string) => {
    return parseFloat(val?.toString() || '0') * (type === 'us_stock' ? usdRate : 1);
  };

  const getTRY = (val: string | number, type: string, rate: number = 1) => {
    return parseFloat(val?.toString() || '0') * (type === 'us_stock' ? rate : 1);
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter positions based on selected date range
  const getFilteredData = () => {
    let filteredClosed: ClosedPosition[] = [];
    let filteredActive: Position[] = [];

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
    return sum + (getTRY(pos.currentPrice || '0', pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const filteredTotalCost = filteredActivePositions.reduce((sum, pos) => {
    // Current requirement: Use current rate for everything for US stocks
    const rate = pos.type === 'us_stock' ? usdRate : 1;
    return sum + (parseFloat(pos.buyPrice) * parseFloat(pos.quantity) * rate);
  }, 0);

  const filteredProfit = filteredTotalValue - filteredTotalCost;

  // Overall portfolio metrics (all positions)
  const totalValue = positions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice || '0', pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const totalCost = positions.reduce((sum, pos) => {
    const rate = pos.type === 'us_stock' ? usdRate : 1;
    return sum + (parseFloat(pos.buyPrice) * parseFloat(pos.quantity) * rate);
  }, 0);

  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const realizedProfit = filteredClosedPositions.reduce((sum, pos) => {
    if (pos.type === 'us_stock') {
      const sellPrice = parseFloat(pos.sellPrice);
      const buyPrice = parseFloat(pos.buyPrice);
      return sum + (sellPrice - buyPrice) * parseFloat(pos.quantity) * usdRate;
    }
    return sum + parseFloat(pos.pl);
  }, 0);

  const realizedProfitTotal = closedPositions.reduce((sum, pos) => {
    if (pos.type === 'us_stock') {
      const sellPrice = parseFloat(pos.sellPrice);
      const buyPrice = parseFloat(pos.buyPrice);
      return sum + (sellPrice - buyPrice) * parseFloat(pos.quantity) * usdRate;
    }
    return sum + parseFloat(pos.pl);
  }, 0);

  const realizedCostTotal = closedPositions.reduce((sum, pos) => {
    const rate = pos.type === 'us_stock' ? usdRate : 1;
    return sum + (getTRY(pos.buyPrice, pos.type, rate) * parseFloat(pos.quantity));
  }, 0);

  const unrealizedProfit = totalProfit;
  const netProfit = realizedProfit + unrealizedProfit;
  const netProfitTotal = realizedProfitTotal + unrealizedProfit;
  const lifetimeCost = totalCost + realizedCostTotal;
  const netProfitPercent = lifetimeCost > 0 ? (netProfitTotal / lifetimeCost) * 100 : 0;

  // Asset type analysis
  const stockPositions = positions.filter(pos => pos.type === 'stock');
  const fundPositions = positions.filter(pos => pos.type === 'fund');
  const usStockPositions = positions.filter(pos => pos.type === 'us_stock');

  const stockValue = stockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice || '0', pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const stockCost = stockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, 1) * parseFloat(pos.quantity));
  }, 0);

  const stockPL = stockValue - stockCost;

  const fundValue = fundPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice || '0', pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const fundCost = fundPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, 1) * parseFloat(pos.quantity));
  }, 0);

  const fundPL = fundValue - fundCost;

  // US Stocks (stored in USD internally, multiply by rate for TRY totals)
  const usStockValue = usStockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice || '0', pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);
  const usStockCost = usStockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);
  const usStockPL = usStockValue - usStockCost;
  // USD display values (native without rate)
  const usStockValueUSD = usStockPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice || '0') * parseFloat(pos.quantity));
  }, 0);
  const usStockPLUSD = usStockPositions.reduce((sum, pos) => {
    const cp = parseFloat(pos.currentPrice || pos.buyPrice);
    const bp = parseFloat(pos.buyPrice);
    return sum + ((cp - bp) * parseFloat(pos.quantity));
  }, 0);

  // Asset allocation percentages
  const stockPercentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const fundPercentage = totalValue > 0 ? (fundValue / totalValue) * 100 : 0;
  const usStockPercentage = totalValue > 0 ? (usStockValue / totalValue) * 100 : 0;

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
        <div className="bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-[14px] flex items-center mb-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('daily')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'daily' ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Günlük
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('monthly')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'monthly' ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Aylık
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('all')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Tümü
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('custom')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'custom' ? 'bg-white dark:bg-gray-700 shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            Özel
          </Button>
        </div>

        {timeRange === 'custom' && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-4">
            <div className="flex justify-center items-center space-x-6">
              <div className="space-y-2 flex-1 max-w-[140px]">
                <Label htmlFor="startDate" className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center block">Başlangıç Tarihi</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs text-center"
                  max={endDate || undefined}
                />
              </div>
              <div className="flex items-center pt-6">
                <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
              </div>
              <div className="space-y-2 flex-1 max-w-[140px]">
                <Label htmlFor="endDate" className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center block">Bitiş Tarihi</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs text-center"
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
          <div className={`mt-3 p-3 rounded-lg border ${filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30'}`}>
            <p className={`text-sm font-medium flex items-center ${filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-green-800 dark:text-green-200'}`}>
              <CalendarDays className="w-4 h-4 inline mr-2" />
              {filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'Bugün işlem yapılmadı' : `Bugün: ${filteredActivePositions.length} pozisyon açıldı, ${filteredClosedPositions.length} pozisyon kapatıldı`}
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
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 flex items-center justify-between mb-0 pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Portföy Durumu
                </h3>
              </div>

              {/* Show filtered period data if custom date range is selected */}
              {timeRange === 'custom' && startDate && endDate ? (
                <div className="flex flex-col pb-4">
                  <div className="grid grid-cols-2 gap-4 px-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dönem Değer</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(filteredTotalValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dönem Maliyet</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(filteredTotalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 px-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Dönem K/Z:</span>
                      <div className="text-right">
                        <span className={`font-bold ${filteredProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {filteredProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(filteredProfit))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 px-4">
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
                <div className="flex flex-col">
                  <div className="px-4 pb-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Güncel Değer</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Maliyet</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(totalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col">
                    <div className="px-4 pb-4 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Aktif Pozisyonlar K/Z</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Unrealized</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[17px] font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {totalProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(totalProfit))}
                        </span>
                        <span className={`text-[11px] font-semibold mt-0.5 px-2 py-0.5 tracking-wide rounded-md ${totalProfitPercent >= 0 ? 'bg-green-100/70 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100/70 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {totalProfitPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(totalProfitPercent))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-4 w-full bg-muted mt-auto">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[15px] font-bold text-gray-900 dark:text-white">Net Portföy K/Z</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex items-center bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300">LIFETIME</span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Unrealized + Realized</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[17px] font-bold ${netProfitTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {netProfitTotal >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(netProfitTotal))}
                        </span>
                        <span className={`text-[11px] font-semibold mt-0.5 px-2 py-0.5 tracking-wide rounded-md ${netProfitPercent >= 0 ? 'bg-green-100/70 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100/70 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {netProfitPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(netProfitPercent))}
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

            {/* Asset Type P&L Analysis */}
            {(() => {
              const stockPLPercent = stockCost > 0 ? (stockPL / stockCost) * 100 : 0;
              const fundPLPercent = fundCost > 0 ? (fundPL / fundCost) * 100 : 0;
              const usStockPLPercent = usStockCost > 0 ? (usStockPL / usStockCost) * 100 : 0;

              const PLBadge = ({ value }: { value: number }) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${value >= 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                  {value >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(value))}
                </span>
              );

              const CountBadge = ({ count }: { count: number }) => (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-gray-200 dark:ring-gray-700">
                  {count}
                </span>
              );

              return (
                <Card className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Kar/Zarar Dağılımı
                    </h3>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700">

                    {/* BIST Row */}
                    <div className="flex items-stretch py-4 gap-4">
                      <div className="flex-1 min-0 space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Hisse Senedi (BIST)</p>
                          <CountBadge count={stockPositions.length} />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(stockValue)}</p>
                      </div>
                      <div className="w-px bg-gray-100 dark:bg-gray-700 self-stretch" />
                      <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                        <p className={`text-base font-bold ${stockPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stockPL >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(stockPL))}
                        </p>
                        <div className="flex justify-end"><PLBadge value={stockPLPercent} /></div>
                      </div>
                    </div>

                    {/* ABD Row */}
                    {usStockPositions.length > 0 && (
                      <div className="flex items-stretch py-4 gap-4">
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Yabancı Hisse (ABD)</p>
                            <CountBadge count={usStockPositions.length} />
                          </div>
                          <p className="text-base font-bold text-gray-900 dark:text-white">${formatTurkishPrice(usStockValueUSD)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            ₺{formatTurkishPrice(usStockValue)} · @{formatTurkishPrice(usdRate)}
                          </p>
                        </div>
                        <div className="w-px bg-gray-100 dark:bg-gray-700 self-stretch" />
                        <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                          <p className={`text-base font-bold ${usStockPLUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {usStockPLUSD >= 0 ? '+' : '-'}${formatTurkishPrice(Math.abs(usStockPLUSD))}
                          </p>
                          <p className={`text-xs ${usStockPL >= 0 ? 'text-green-500 dark:text-green-500' : 'text-red-400 dark:text-red-500'}`}>
                            {usStockPL >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(usStockPL))}
                          </p>
                          <div className="flex justify-end"><PLBadge value={usStockPLPercent} /></div>
                        </div>
                      </div>
                    )}

                    {/* Fon Row */}
                    <div className="flex items-stretch py-4 gap-4">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Fon</p>
                          <CountBadge count={fundPositions.length} />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">₺{formatTurkishPrice(fundValue)}</p>
                      </div>
                      <div className="w-px bg-gray-100 dark:bg-gray-700 self-stretch" />
                      <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                        <p className={`text-base font-bold ${fundPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {fundPL >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(fundPL))}
                        </p>
                        <div className="flex justify-end"><PLBadge value={fundPLPercent} /></div>
                      </div>
                    </div>

                  </div>
                </Card>
              );
            })()}

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

                      {/* US Stock allocation arc */}
                      {usStockPercentage > 0 && (
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${(usStockPercentage / 100) * 251.3} 251.3`}
                          strokeDashoffset={`${-(stockPercentage / 100) * 251.3}`}
                          className="drop-shadow-sm stroke-purple-500 dark:stroke-purple-400"
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
                          strokeDashoffset={`${-((stockPercentage + usStockPercentage) / 100) * 251.3}`}
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
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Hisse Senedi (BIST)</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatTurkishPercent(stockPercentage)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">₺{formatTurkishPrice(stockValue)}</span>
                    </div>
                  </div>

                  {usStockPositions.length > 0 && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 dark:bg-purple-400 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Yabancı Hisse (ABD)</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatTurkishPercent(usStockPercentage)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">₺{formatTurkishPrice(usStockValue)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fon</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatTurkishPercent(fundPercentage)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">₺{formatTurkishPrice(fundValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Unified AI Hub Card (Modern Glow Edition) */}
            <div className="relative group mt-8 mb-12">
              {/* SHARED Glow Background for the entire Hub */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse" />
              
              <Card className="relative z-10 overflow-hidden border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                {/* Top Section: AI Trigger */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={handleAiAnalyze}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                        <LuSparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Yapay Zeka Görüşü</h3>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Integrated Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* Bottom Section: Past Analyses */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-400" />
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Geçmiş Analizler</h4>
                    </div>
                    {aiHistory.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-400 hover:text-red-500 transition-colors h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="z-[100]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Geçmişi Temizle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tüm yapay zeka analiz geçmişiniz kalıcı olarak silinecektir.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteHistoryMutation.mutate()}
                              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {aiHistory
                      .filter(h => h.role === 'model')
                      .slice(0, showAllHistory ? undefined : 3)
                      .map((history) => (
                        <div key={history.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-indigo-100 dark:hover:border-indigo-900/40 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground mb-1">
                                {new Date(history.timestamp!).toLocaleString('tr-TR')}
                              </p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                {history.content}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="ml-2 h-7 w-7 p-0" onClick={() => {
                              setAiMessage(""); 
                              setIsAiDrawerOpen(true);
                            }}>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    
                    {aiHistory.filter(h => h.role === 'model').length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[11px] text-indigo-600 dark:text-indigo-400 font-medium py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        onClick={() => setShowAllHistory(!showAllHistory)}
                      >
                        {showAllHistory ? (
                          <span className="flex items-center justify-center gap-1"><ChevronUp className="w-3 h-3" /> Daha Az Göster</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1"><ChevronDown className="w-3 h-3" /> Daha Fazla Göster ({aiHistory.filter(h => h.role === 'model').length - 3})</span>
                        )}
                      </Button>
                    )}
                    
                    {aiHistory.length === 0 && !historyLoading && (
                      <div className="text-center py-6 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-[11px] text-gray-400">Henüz bir analiz yapılmadı.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* AI Bottom Sheet (Drawer) */}
      <Drawer.Root open={isAiDrawerOpen} onOpenChange={setIsAiDrawerOpen} shouldScaleBackground>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
          <Drawer.Content 
            className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col outline-none transition-[height] duration-200"
            style={{ height: isAiDrawerOpen ? `${viewportHeight * 0.85}px` : 'auto', maxHeight: '85dvh' }}
          >
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-t-[20px] flex flex-col overflow-hidden p-4">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 mb-6" />
              
              <div className="flex items-center justify-between mb-4">
                <Drawer.Title className="text-lg font-bold flex items-center gap-2">
                  <LuSparkles className="text-indigo-600" />
                  Yapay Zeka Analisti
                </Drawer.Title>
              </div>

              <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-4">
                {aiHistory.length === 0 && analyzeMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Portföyünüz Analiz Ediliyor...</p>
                      <p className="text-sm text-gray-500 italic">Varlıklarınız ve performansınız Gemini 2.5 Flash ile inceleniyor.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    {[...aiHistory].reverse().map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                          <p className={`text-[10px] mt-1.5 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.timestamp!).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {analyzeMutation.isPending && aiHistory.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200 dark:border-gray-700">
                          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="pt-4 pb-[env(safe-area-inset-bottom,16px)] border-t border-gray-100 dark:border-gray-800">
                <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                  <Input 
                    placeholder="Analiz hakkında soru sor..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={analyzeMutation.isPending}
                    className="flex-1 pr-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-indigo-500"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!aiMessage.trim() || analyzeMutation.isPending}
                    className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </Button>
                </form>
                <p className="text-[10px] text-center text-gray-400 mt-2">
                  Gemini 2.5 Flash tarafından desteklenmektedir. Yatırım tavsiyesi değildir.
                </p>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}