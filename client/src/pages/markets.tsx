import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Search, TrendingUp, TrendingDown } from "lucide-react";
import { formatTurkishPrice, formatTurkishPercent } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface MarketSymbol {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isFollowed: boolean;
}

// BIST 30 major symbols
const BIST_SYMBOLS = [
  { symbol: "AKBNK", name: "Akbank T.A.Ş." },
  { symbol: "AKFIS", name: "Ak Finansal Kiralama A.Ş." },
  { symbol: "ALARK", name: "Alarko Holding A.Ş." },
  { symbol: "ARCLK", name: "Arçelik A.Ş." },
  { symbol: "ASELS", name: "Aselsan Elektronik San. ve Tic. A.Ş." },
  { symbol: "BIMAS", name: "BİM Birleşik Mağazalar A.Ş." },
  { symbol: "CCOLA", name: "Coca-Cola İçecek A.Ş." },
  { symbol: "DOHOL", name: "Doğan Şirketler Grubu Holding A.Ş." },
  { symbol: "EKGYO", name: "Emlak Konut GYO A.Ş." },
  { symbol: "ENKAI", name: "Enka İnşaat ve Sanayi A.Ş." },
  { symbol: "EREGL", name: "Ereğli Demir ve Çelik Fabrikaları T.A.Ş." },
  { symbol: "FROTO", name: "Ford Otomotiv Sanayi A.Ş." },
  { symbol: "GARAN", name: "Türkiye Garanti Bankası A.Ş." },
  { symbol: "HALKB", name: "Türkiye Halk Bankası A.Ş." },
  { symbol: "ISCTR", name: "Türkiye İş Bankası A.Ş." },
  { symbol: "KCHOL", name: "Koç Holding A.Ş." },
  { symbol: "KRDMD", name: "Kardemir Karabük Demir Çelik Sanayi ve Ticaret A.Ş." },
  { symbol: "MIGRS", name: "Migros Ticaret A.Ş." },
  { symbol: "OTKAR", name: "Otokar Otomotiv ve Savunma Sanayi A.Ş." },
  { symbol: "PETKM", name: "Petkim Petrokimya Holding A.Ş." },
  { symbol: "PGSUS", name: "Pegasus Hava Taşımacılığı A.Ş." },
  { symbol: "SAHOL", name: "Sabancı Holding A.Ş." },
  { symbol: "SASA", name: "Sasa Polyester Sanayi A.Ş." },
  { symbol: "SISE", name: "Şişe ve Cam Fabrikaları A.Ş." },
  { symbol: "TAVHL", name: "TAV Havalimanları Holding A.Ş." },
  { symbol: "TCELL", name: "Turkcell İletişim Hizmetleri A.Ş." },
  { symbol: "TKFEN", name: "Tekfen Holding A.Ş." },
  { symbol: "TOASO", name: "Tofaş Türk Otomobil Fabrikası A.Ş." },
  { symbol: "TUPRS", name: "Tüpraş-Türkiye Petrol Rafinerileri A.Ş." },
  { symbol: "ULKER", name: "Ülker Bisküvi Sanayi A.Ş." },
  { symbol: "VAKBN", name: "Vakıflar Bankası T.A.O." },
  { symbol: "VESTL", name: "Vestel Elektronik Sanayi ve Ticaret A.Ş." },
  { symbol: "YKBNK", name: "Yapı ve Kredi Bankası A.Ş." }
];

export default function Markets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [followedSymbols, setFollowedSymbols] = useState<string[]>([]);
  const { toast } = useToast();

  // Load followed symbols from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('followedSymbols');
    if (saved) {
      setFollowedSymbols(JSON.parse(saved));
    }
  }, []);

  // Save followed symbols to localStorage
  const saveFollowedSymbols = (symbols: string[]) => {
    setFollowedSymbols(symbols);
    localStorage.setItem('followedSymbols', JSON.stringify(symbols));
  };

  const { data: marketData = [], isLoading, refetch } = useQuery<MarketSymbol[]>({
    queryKey: ['/api/market-data'],
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredSymbols = BIST_SYMBOLS.filter(symbol =>
    symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    symbol.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleFollow = (symbol: string) => {
    if (followedSymbols.includes(symbol)) {
      const newFollowed = followedSymbols.filter(s => s !== symbol);
      saveFollowedSymbols(newFollowed);
      toast({
        title: "Takipten Çıkarıldı",
        description: `${symbol} takip listenizden çıkarıldı`,
      });
    } else {
      const newFollowed = [...followedSymbols, symbol];
      saveFollowedSymbols(newFollowed);
      toast({
        title: "Takibe Eklendi",
        description: `${symbol} takip listenize eklendi`,
      });
    }
  };

  const getSymbolData = (symbol: string): MarketSymbol | null => {
    return marketData.find(data => data.symbol === symbol) || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">Piyasalar</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-3 text-blue-600 hover:bg-blue-50 rounded-full"
            onClick={() => refetch()}
          >
            <TrendingUp className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Sembol veya şirket adı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Followed Symbols Section */}
      {followedSymbols.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Takip Edilen Semboller</h2>
          <div className="space-y-2">
            {followedSymbols.map(symbol => {
              const symbolInfo = BIST_SYMBOLS.find(s => s.symbol === symbol);
              const marketInfo = getSymbolData(symbol);
              
              if (!symbolInfo) return null;

              return (
                <Card key={symbol} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {symbol.substring(0, 3)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{symbol}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {symbolInfo.name.length > 30 ? `${symbolInfo.name.substring(0, 30)}...` : symbolInfo.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center space-x-3">
                      {marketInfo ? (
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ₺{formatTurkishPrice(marketInfo.price)}
                          </p>
                          <div className={`flex items-center text-sm ${
                            parseFloat(marketInfo.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {parseFloat(marketInfo.changePercent) >= 0 ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            {formatTurkishPercent(parseFloat(marketInfo.changePercent))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Fiyat yükleniyor...</p>
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFollow(symbol)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Results Section */}
      {searchQuery && (
        <div className="px-4 pb-24">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Arama Sonuçları ({filteredSymbols.length})
          </h2>
          <div className="space-y-2">
            {filteredSymbols.map(symbol => {
              const isFollowed = followedSymbols.includes(symbol.symbol);
              const marketInfo = getSymbolData(symbol.symbol);

              return (
              <Card key={symbol.symbol} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">
                          {symbol.symbol.substring(0, 3)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{symbol.symbol}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {symbol.name.length > 30 ? `${symbol.name.substring(0, 30)}...` : symbol.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center space-x-3">
                    {marketInfo ? (
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₺{formatTurkishPrice(marketInfo.price)}
                        </p>
                        <div className={`flex items-center text-sm ${
                          parseFloat(marketInfo.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(marketInfo.changePercent) >= 0 ? (
                            <TrendingUp className="w-4 h-4 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-1" />
                          )}
                          {formatTurkishPercent(parseFloat(marketInfo.changePercent))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Fiyat yükleniyor...</p>
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFollow(symbol.symbol)}
                      className={`p-2 rounded-full ${
                        isFollowed 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {isFollowed ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
            })}
          </div>
        </div>
      )}

      {/* All Symbols Section - Only show when no search */}
      {!searchQuery && (
        <div className="px-4 pb-24">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Popüler BIST Sembolleri</h2>
          <div className="space-y-2">
            {BIST_SYMBOLS.slice(0, 10).map(symbol => {
              const isFollowed = followedSymbols.includes(symbol.symbol);
              const marketInfo = getSymbolData(symbol.symbol);

              return (
                <Card key={symbol.symbol} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {symbol.symbol.substring(0, 3)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{symbol.symbol}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {symbol.name.length > 30 ? `${symbol.name.substring(0, 30)}...` : symbol.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center space-x-3">
                      {marketInfo ? (
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ₺{formatTurkishPrice(marketInfo.price)}
                          </p>
                          <div className={`flex items-center text-sm ${
                            parseFloat(marketInfo.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {parseFloat(marketInfo.changePercent) >= 0 ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            {formatTurkishPercent(parseFloat(marketInfo.changePercent))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Fiyat yükleniyor...</p>
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFollow(symbol.symbol)}
                        className={`p-2 rounded-full ${
                          isFollowed 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {isFollowed ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}