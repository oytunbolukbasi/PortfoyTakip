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
    <div className="min-h-screen bg-background">
      {/* Top App Bar */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
            </div>
            <h1 className="text-lg font-medium">Portföy Takip</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-white hover:bg-primary-dark"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-white hover:bg-primary-dark"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Portfolio Summary */}
      <PortfolioSummary positions={positions} />

      {/* Tab Navigation */}
      <nav className="bg-surface border-b border-gray-200">
        <div className="flex">
          <button
            className={`flex-1 py-3 px-4 text-center border-b-2 font-medium ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Aktif Pozisyonlar
          </button>
          <button
            className={`flex-1 py-3 px-4 text-center border-b-2 font-medium ${
              activeTab === 'closed'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary'
            }`}
            onClick={() => setActiveTab('closed')}
          >
            Kapalı Pozisyonlar
          </button>
        </div>
      </nav>

      {/* Search and Filter */}
      <div className="p-4 pb-0">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Varlık ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {activeTab === 'active' && (
          <>
            {positionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-text-secondary">
                    <path d="M11,2V22C5.9,21.5 2,17.2 2,12S5.9,2.5 11,2M13,2V11H22C22,6.8 18.2,3 13,2M13,13V22C18.1,21.5 22,17.2 22,13H13Z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz pozisyon yok'}
                </h3>
                <p className="text-text-secondary mb-6">
                  {searchQuery ? 'Farklı anahtar kelimeler deneyin' : 'İlk yatırımınızı ekleyerek başlayın'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddModal(true)}>
                    Pozisyon Ekle
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
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

      {/* Floating Action Button */}
      {activeTab === 'active' && (
        <FloatingActionButton onClick={() => setShowAddModal(true)} />
      )}

      {/* Add Position Modal */}
      <AddPositionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refetchPositions}
      />
    </div>
  );
}
