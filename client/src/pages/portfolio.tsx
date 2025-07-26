import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, ClosedPosition } from "@shared/schema";
import PortfolioSummary from "@/components/ui/portfolio-summary";
import PositionCard from "@/components/ui/position-card";
import BottomNavigation from "@/components/ui/bottom-navigation";
import AddPositionModal from "@/components/ui/add-position-modal";
import FloatingActionButton from "@/components/ui/floating-action-button";
import { RefreshCw, Settings, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: positions = [], isLoading: positionsLoading, refetch: refetchPositions } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: closedPositions = [], isLoading: closedLoading } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

  const filteredPositions = positions.filter(position =>
    position.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (position.name && position.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClosedPositions = closedPositions.filter(position =>
    position.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (position.name && position.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRefresh = async () => {
    try {
      await fetch('/api/prices/refresh', { method: 'POST' });
      await refetchPositions();
      toast({
        title: "Fiyatlar güncellendi",
        description: "Tüm pozisyonların fiyatları başarıyla güncellendi.",
      });
    } catch (error) {
      toast({
        title: "Güncelleme hatası",
        description: "Fiyatlar güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iPhone-style Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">Portföy</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full font-medium"
              onClick={() => setShowAddModal(true)}
            >
              <span className="text-lg">+</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Portfolio Summary */}
      <PortfolioSummary positions={positions} />

      {/* iPhone-style Segmented Control */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-md transition-all ${
              activeTab === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Aktif
          </button>
          <button
            className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-md transition-all ${
              activeTab === 'closed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('closed')}
          >
            Tamamlanan
          </button>
        </div>
      </div>

      {/* iPhone-style Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Arama"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-24">
        {activeTab === 'active' && (
          <>
            {positionsLoading ? (
              <div className="space-y-3 px-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-gray-400">
                    <path d="M11,2V22C5.9,21.5 2,17.2 2,12S5.9,2.5 11,2M13,2V11H22C22,6.8 18.2,3 13,2M13,13V22C18.1,21.5 22,17.2 22,13H13Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Sonuç Bulunamadı' : 'Henüz Pozisyon Yok'}
                </h3>
                <p className="text-gray-500 mb-8 text-base">
                  {searchQuery ? 'Farklı anahtar kelimeler deneyin' : 'İlk yatırımınızı ekleyerek başlayın'}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Pozisyon Ekle
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {filteredPositions.map((position) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    onRefresh={refetchPositions}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'closed' && (
          <>
            {closedLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredClosedPositions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-text-secondary">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz kapalı pozisyon yok'}
                </h3>
                <p className="text-text-secondary">
                  {searchQuery ? 'Farklı anahtar kelimeler deneyin' : 'Pozisyonlarınızı kapattığınızda burada görünecek'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClosedPositions.map((position) => (
                  <div
                    key={position.id}
                    className="bg-surface rounded-lg shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          position.type === 'stock' ? 'bg-primary' : 'bg-secondary'
                        }`}>
                          <span className="text-white font-medium text-sm">
                            {position.symbol.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-text-primary">{position.symbol}</h3>
                          <p className="text-sm text-text-secondary">{position.name || position.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-medium">₺{parseFloat(position.sellPrice).toFixed(2)}</p>
                        <p className="text-sm text-text-secondary">
                          {new Date(position.sellDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-text-secondary">Adet</p>
                        <p className="font-mono font-medium">{position.quantity}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Alış</p>
                        <p className="font-mono font-medium">₺{parseFloat(position.buyPrice).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Satış</p>
                        <p className="font-mono font-medium">₺{parseFloat(position.sellPrice).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary text-sm">Net P/L:</span>
                        <div className="text-right">
                          <span className={`font-mono text-sm font-medium ${
                            parseFloat(position.pl) >= 0 ? 'text-success' : 'text-error'
                          }`}>
                            {parseFloat(position.pl) >= 0 ? '+' : ''}₺{parseFloat(position.pl).toFixed(2)}
                          </span>
                          <span className={`font-mono text-sm ml-1 ${
                            parseFloat(position.plPercent) >= 0 ? 'text-success' : 'text-error'
                          }`}>
                            ({parseFloat(position.plPercent) >= 0 ? '+' : ''}{parseFloat(position.plPercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="portfolio" />



      {/* Add Position Modal */}
      <AddPositionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refetchPositions}
      />
    </div>
  );
}
