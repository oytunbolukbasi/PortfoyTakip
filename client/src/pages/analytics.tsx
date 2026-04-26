import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Position, ClosedPosition, AiChatHistory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  BarChart3, 
  Moon, 
  Sun, 
  Send, 
  Loader2, 
  History, 
  ChevronRight, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Info,
  MessageSquare,
  Sparkles,
  X
} from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { formatTurkishPrice, formatTurkishPercent } from "@/lib/format";
import { LuSparkles } from "react-icons/lu";
import { Drawer } from "vaul";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
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
      analyzeMutation.mutate("");
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
    return sum + (getTRY(pos.currentPrice ?? pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const filteredTotalCost = filteredActivePositions.reduce((sum, pos) => {
    // Current requirement: Use current rate for everything for US stocks
    const rate = pos.type === 'us_stock' ? usdRate : 1;
    return sum + (parseFloat(pos.buyPrice) * parseFloat(pos.quantity) * rate);
  }, 0);

  const filteredProfit = filteredTotalValue - filteredTotalCost;

  // Overall portfolio metrics (all positions)
  const totalValue = positions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice ?? pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
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
    return sum + (getTRY(pos.currentPrice ?? pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const stockCost = stockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, 1) * parseFloat(pos.quantity));
  }, 0);

  const stockPL = stockValue - stockCost;

  const fundValue = fundPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice ?? pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);

  const fundCost = fundPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, 1) * parseFloat(pos.quantity));
  }, 0);

  const fundPL = fundValue - fundCost;

  // US Stocks (stored in USD internally, multiply by rate for TRY totals)
  const usStockValue = usStockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.currentPrice ?? pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);
  const usStockCost = usStockPositions.reduce((sum, pos) => {
    return sum + (getTRY(pos.buyPrice, pos.type, usdRate) * parseFloat(pos.quantity));
  }, 0);
  const usStockPL = usStockValue - usStockCost;
  // USD display values (native without rate)
  const usStockValueUSD = usStockPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.currentPrice ?? pos.buyPrice) * parseFloat(pos.quantity));
  }, 0);
  const usStockPLUSD = usStockPositions.reduce((sum, pos) => {
    const cp = parseFloat(pos.currentPrice ?? pos.buyPrice);
    const bp = parseFloat(pos.buyPrice);
    return sum + ((cp - bp) * parseFloat(pos.quantity));
  }, 0);

  // Asset allocation percentages
  const stockPercentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const fundPercentage = totalValue > 0 ? (fundValue / totalValue) * 100 : 0;
  const usStockPercentage = totalValue > 0 ? (usStockValue / totalValue) * 100 : 0;

  const isLoading = positionsLoading || closedLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* iPhone-style Navigation Bar (Borderless & Translucent) */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center justify-between px-5 h-16">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analiz</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
      {/* Time Range Selector */}
      <div className="px-4 py-4">
        <div className="bg-subtle/50 p-1 rounded-[14px] flex items-center mb-4 shadow-sm border border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('daily')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'daily' ? 'bg-card shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            Günlük
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('monthly')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'monthly' ? 'bg-card shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            Aylık
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('all')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'all' ? 'bg-card shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            Tümü
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRange('custom')}
            className={`flex-1 rounded-xl transition-all ${timeRange === 'custom' ? 'bg-card shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            Özel
          </Button>
        </div>

        {timeRange === 'custom' && (
          <div className="bg-subtle p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Başlangıç Tarihi */}
              <div className="flex flex-col flex-1">
                <Label className="text-[11px] font-medium text-text-secondary text-center mb-1.5">Başlangıç</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-11 w-full justify-center text-[13px] font-medium bg-card rounded-xl border-border shadow-sm ${!startDate && "text-muted-foreground"}`}
                    >
                      {startDate ? format(new Date(startDate), "d MMM yyyy", { locale: tr }) : "Tarih Seç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="center">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ayırıcı */}
              <div className="flex flex-col justify-center pt-5 flex-shrink-0">
                <span className="text-text-tertiary text-sm">-</span>
              </div>

              {/* Bitiş Tarihi */}
              <div className="flex flex-col flex-1">
                <Label className="text-[11px] font-medium text-text-secondary text-center mb-1.5">Bitiş</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-11 w-full justify-center text-[13px] font-medium bg-card rounded-xl border-border shadow-sm ${!endDate && "text-muted-foreground"}`}
                    >
                      {endDate ? format(new Date(endDate), "d MMM yyyy", { locale: tr }) : "Tarih Seç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="center">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {startDate && endDate && (
              <div className="bg-primary-100 p-3 rounded-lg border border-border">
                <p className="text-sm text-text-primary font-medium">
                  <CalendarDays className="w-4 h-4 inline mr-2" />
                  Seçili Dönem: {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  • {filteredActivePositions.length} pozisyon açıldı • {filteredClosedPositions.length} pozisyon kapatıldı
                </p>
              </div>
            )}
          </div>
        )}

        {timeRange === 'all' && (
          <div className="mt-3 p-3 bg-subtle rounded-lg border border-border">
            <p className="text-sm text-text-primary font-medium">
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Tüm Veriler: {positions.length} aktif pozisyon, {closedPositions.length} kapalı pozisyon
            </p>
          </div>
        )}

        {timeRange === 'daily' && (
          <div className={`mt-3 p-3 rounded-lg border ${filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'bg-subtle border-border' : 'bg-success-100 border-success-100'}`}>
            <p className={`text-sm font-medium flex items-center ${filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'text-text-secondary' : 'text-success-500'}`}>
              <CalendarDays className="w-4 h-4 inline mr-2" />
              {filteredActivePositions.length === 0 && filteredClosedPositions.length === 0 ? 'Bugün işlem yapılmadı' : `Bugün: ${filteredActivePositions.length} pozisyon açıldı, ${filteredClosedPositions.length} pozisyon kapatıldı`}
            </p>
          </div>
        )}

        {timeRange === 'monthly' && (
          <div className="mt-3 p-3 bg-primary-100 rounded-lg border border-border">
            <p className="text-sm text-text-primary font-medium">
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
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-4 flex items-center justify-between mb-0 pb-3">
                <h3 className="font-semibold text-text-primary flex items-center">
                  Portföy Durumu
                </h3>
              </div>

              {/* Show filtered period data if custom date range is selected */}
              {timeRange === 'custom' && startDate && endDate ? (
                <div className="flex flex-col pb-4">
                  <div className="grid grid-cols-2 gap-4 px-4">
                    <div>
                      <p className="text-sm text-text-secondary">Dönem Değer</p>
                      <p className="text-xl font-bold text-text-primary">₺{formatTurkishPrice(filteredTotalValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Dönem Maliyet</p>
                      <p className="text-xl font-bold text-text-primary">₺{formatTurkishPrice(filteredTotalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border px-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Dönem K/Z:</span>
                      <div className="text-right">
                        <span className={`font-bold ${filteredProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                          {filteredProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(filteredProfit))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border px-4">
                    <p className="text-xs text-text-secondary mb-2">Genel Portföy:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-text-secondary">Toplam Değer</p>
                        <p className="text-lg font-bold text-text-primary">₺{formatTurkishPrice(totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">Toplam K/Z</p>
                        <span className={`text-lg font-bold ${totalProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
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
                      <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">Güncel Değer</p>
                      <p className="text-xl font-bold text-text-primary">₺{formatTurkishPrice(totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">Maliyet</p>
                      <p className="text-xl font-bold text-text-primary">₺{formatTurkishPrice(totalCost)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-4 border-t border-border flex flex-col">
                    <div className="px-4 pb-4 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary">Aktif Pozisyonlar K/Z</span>
                        <span className="text-xs text-text-tertiary font-medium">Unrealized</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[17px] font-bold ${totalProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                          {totalProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(totalProfit))}
                        </span>
                        <span className={`text-[11px] font-semibold mt-0.5 px-2 py-0.5 tracking-wide rounded-md ${totalProfitPercent >= 0 ? 'bg-success-100 text-success-500' : 'bg-error-100 text-error-500'}`}>
                          {totalProfitPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(totalProfitPercent))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-4 w-full bg-muted mt-auto">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[15px] font-bold text-text-primary">Net Portföy K/Z</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex items-center bg-subtle text-text-secondary">LIFETIME</span>
                        </div>
                        <span className="text-xs text-text-tertiary font-medium">Unrealized + Realized</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[17px] font-bold ${netProfitTotal >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                          {netProfitTotal >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(netProfitTotal))}
                        </span>
                        <span className={`text-[11px] font-semibold mt-0.5 px-2 py-0.5 tracking-wide rounded-md ${netProfitPercent >= 0 ? 'bg-success-100 text-success-500' : 'bg-error-100 text-error-500'}`}>
                          {netProfitPercent >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(netProfitPercent))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>


            {/* Profit/Loss Summary */}
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary flex items-center">
                  Kar/Zarar Özeti
                  {timeRange === 'custom' && startDate && endDate && (
                    <span className="text-xs text-text-tertiary ml-2">
                      ({new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')})
                    </span>
                  )}
                  {timeRange === 'daily' && (
                    <span className="text-xs text-text-tertiary ml-2">(Bugün)</span>
                  )}
                  {timeRange === 'monthly' && (
                    <span className="text-xs text-text-tertiary ml-2">(Bu Ay)</span>
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    Gerçekleşen K/Z {timeRange !== 'custom' || !startDate || !endDate ? '(Seçili Dönem)' : ''}:
                  </span>
                  <span className={`font-semibold ${realizedProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                    {realizedProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(realizedProfit))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Gerçekleşmemiş K/Z:</span>
                  <span className={`font-semibold ${unrealizedProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                    {unrealizedProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(unrealizedProfit))}
                  </span>
                </div>
                {timeRange === 'custom' && startDate && endDate && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-text-secondary">Toplam Gerçekleşen K/Z:</span>
                    <span className={`font-semibold ${realizedProfitTotal >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                      {realizedProfitTotal >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(realizedProfitTotal))}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-text-primary">
                      {timeRange === 'custom' && startDate && endDate ? 'Dönem Kar/Zarar:' : 'Kar/Zarar:'}
                    </span>
                    <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                      {netProfit >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(netProfit))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary flex items-center">
                  Performans Metrikleri
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">
                    Aktif Pozisyon
                    {timeRange === 'custom' && startDate && endDate && ' (Genel)'}
                    {timeRange === 'daily' && ' (Genel)'}
                    {timeRange === 'monthly' && ' (Genel)'}
                  </p>
                  <p className="text-2xl font-bold text-primary-500">{positions.length}</p>
                  {(timeRange === 'custom' && startDate && endDate) || timeRange === 'daily' || timeRange === 'monthly' ? (
                    <p className="text-xs text-text-tertiary">
                      Dönem: {filteredActivePositions.length}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-text-secondary">
                    Kapatılan Pozisyon
                    {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                    {timeRange === 'daily' && ' (Bugün)'}
                    {timeRange === 'monthly' && ' (Bu Ay)'}
                  </p>
                  <p className="text-2xl font-bold text-text-secondary">
                    {filteredClosedPositions.length}
                  </p>
                  {timeRange === 'custom' && startDate && endDate && (
                    <p className="text-xs text-text-tertiary">
                      Toplam: {closedPositions.length}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">
                      Kazanan İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-success-500">
                      {filteredClosedPositions.filter(p => parseFloat(p.pl) > 0).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      Kaybeden İşlem
                      {timeRange === 'custom' && startDate && endDate && ' (Dönem)'}
                      {timeRange === 'daily' && ' (Bugün)'}
                      {timeRange === 'monthly' && ' (Bu Ay)'}
                    </p>
                    <p className="text-lg font-semibold text-error-500">
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
                    ? 'bg-success-100 text-success-500'
                    : 'bg-error-100 text-error-500'
                  }`}>
                  {value >= 0 ? '+' : '-'}{formatTurkishPercent(Math.abs(value))}
                </span>
              );

              const CountBadge = ({ count }: { count: number }) => (
                <span className="bg-subtle text-text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-border">
                  {count}
                </span>
              );

              return (
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary">
                      Kar/Zarar Dağılımı
                    </h3>
                  </div>

                  <div className="divide-y divide-border">

                    {/* BIST Row */}
                    <div className="flex items-stretch py-4 gap-4">
                      <div className="flex-1 min-0 space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-text-primary">Hisse Senedi (BIST)</p>
                          <CountBadge count={stockPositions.length} />
                        </div>
                        <p className="text-base font-bold text-text-primary">₺{formatTurkishPrice(stockValue)}</p>
                      </div>
                      <div className="w-px bg-border self-stretch" />
                      <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                        <p className={`text-base font-bold ${stockPL >= 0 ? 'text-success-500' : 'text-error-500'}`}>
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
                            <p className="text-sm font-semibold text-text-primary">Yabancı Hisse (ABD)</p>
                            <CountBadge count={usStockPositions.length} />
                          </div>
                          <p className="text-base font-bold text-text-primary">${formatTurkishPrice(usStockValueUSD)}</p>
                          <p className="text-xs text-text-tertiary">
                            ₺{formatTurkishPrice(usStockValue)} · @{formatTurkishPrice(usdRate)}
                          </p>
                        </div>
                        <div className="w-px bg-border self-stretch" />
                        <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                          <p className={`text-base font-bold ${usStockPLUSD >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                            {usStockPLUSD >= 0 ? '+' : '-'} ${formatTurkishPrice(Math.abs(usStockPLUSD))}
                          </p>
                          <p className={`text-xs ${usStockPL >= 0 ? 'text-success-500' : 'text-error-500'}`}>
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
                          <p className="text-sm font-semibold text-text-primary">Fon</p>
                          <CountBadge count={fundPositions.length} />
                        </div>
                        <p className="text-base font-bold text-text-primary">₺{formatTurkishPrice(fundValue)}</p>
                      </div>
                      <div className="w-px bg-border self-stretch" />
                      <div className="text-right min-w-[120px] space-y-0.5 flex flex-col justify-center">
                        <p className={`text-base font-bold ${fundPL >= 0 ? 'text-success-500' : 'text-error-500'}`}>
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
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary flex items-center">
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
                        style={{ stroke: '#E5E7EB' }}
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
                          style={{ stroke: '#3B82F6' }}
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
                          style={{ stroke: '#8B5CF6' }}
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
                          style={{ stroke: '#10B981' }}
                        />
                      )}
                    </svg>

                    {/* Center text - positioned better for half donut */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center mb-2">
                      <p className="text-sm text-text-secondary mb-1">Toplam Değer</p>
                      <p className="text-xl font-bold text-text-primary">₺{formatTurkishPrice(totalValue)}</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-text-secondary">Hisse Senedi (BIST)</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-text-primary">{formatTurkishPercent(stockPercentage)}</span>
                      <span className="text-xs text-text-tertiary">₺{formatTurkishPrice(stockValue)}</span>
                    </div>
                  </div>

                  {usStockPositions.length > 0 && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-sm text-text-secondary">Yabancı Hisse (ABD)</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-text-primary">{formatTurkishPercent(usStockPercentage)}</span>
                        <span className="text-xs text-text-tertiary">₺{formatTurkishPrice(usStockValue)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-text-secondary">Fon</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-text-primary">{formatTurkishPercent(fundPercentage)}</span>
                      <span className="text-xs text-text-tertiary">₺{formatTurkishPrice(fundValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Unified AI Hub Card (Modern Glow Edition) */}
            <div className="relative group mt-8 mb-12">
              {/* SHARED Glow Background for the entire Hub */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse" />
              
              <Card className="relative z-10 overflow-hidden border-border bg-card/80 backdrop-blur-sm shadow-xl">
                {/* Top Section: AI Trigger */}
                <div 
                  className="p-4 cursor-pointer hover:bg-subtle transition-colors"
                  onClick={handleAiAnalyze}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                        <LuSparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">Yapay Zeka Görüşü</h3>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-text-tertiary" />
                    </div>
                  </div>
                </div>

                {/* Integrated Divider */}
                <div className="border-t border-border" />

                {/* Bottom Section: Past Analyses */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-text-tertiary" />
                      <h4 className="font-bold text-text-secondary text-sm">Geçmiş Analizler</h4>
                    </div>
                    {aiHistory.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-text-tertiary hover:text-error-500 transition-colors h-7 w-7 p-0"
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
                              className="bg-error-500 hover:bg-error-500/90"
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
                        <div key={history.id} className="p-3 bg-subtle rounded-xl border border-border hover:border-primary-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-text-tertiary mb-1">
                                {new Date(history.timestamp!).toLocaleString('tr-TR')}
                              </p>
                              <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                                {history.content}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="ml-2 h-7 w-7 p-0" onClick={() => {
                              setAiMessage(""); 
                              setIsAiDrawerOpen(true);
                            }}>
                              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    
                    {aiHistory.filter(h => h.role === 'model').length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[11px] text-primary-600 font-medium py-1.5 hover:bg-primary-50"
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
                      <div className="text-center py-6 bg-subtle rounded-xl border border-dashed border-border">
                        <p className="text-[11px] text-text-tertiary">Henüz bir analiz yapılmadı.</p>
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
            <div className="flex-1 bg-card rounded-t-[20px] flex flex-col overflow-hidden p-4">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border mb-6" />
              
              <div className="flex items-center justify-between mb-4">
                <Drawer.Title className="text-lg font-bold flex items-center gap-2 text-text-primary">
                  <LuSparkles className="text-indigo-600" />
                  Yapay Zeka Analisti
                </Drawer.Title>
              </div>

              <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-4">
                {aiHistory.length === 0 && analyzeMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <div>
                      <p className="font-semibold text-text-primary">Portföyünüz Analiz Ediliyor...</p>
                      <p className="text-sm text-text-tertiary italic">Varlıklarınız ve performansınız Gemini 2.5 Flash ile inceleniyor.</p>
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
                            : 'bg-subtle text-text-primary rounded-tl-none border border-border'
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
                        <div className="bg-subtle rounded-2xl rounded-tl-none px-4 py-3 border border-border">
                          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="pt-4 pb-[env(safe-area-inset-bottom,16px)] border-t border-border">
                <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                  <Input 
                    placeholder="Analiz hakkında soru sor..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={analyzeMutation.isPending}
                    className="flex-1 pr-12 h-12 rounded-xl bg-subtle border-border focus:ring-indigo-500"
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
      </main>
    </div>
  );
}