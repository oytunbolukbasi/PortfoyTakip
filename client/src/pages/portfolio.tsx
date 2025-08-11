import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, ClosedPosition } from "@shared/schema";
import PortfolioSummary from "@/components/ui/portfolio-summary";
import PositionCard from "@/components/ui/position-card";

import AddPositionModal from "@/components/ui/add-position-modal";
import { PositionDetailModal } from "@/components/ui/position-detail-modal";
import { PositionTable } from "@/components/ui/position-table";

import { RefreshCw, Search, LayoutGrid, Table2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice } from "@/lib/format";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const { toast } = useToast();

  const { data: positions = [], isLoading: positionsLoading, refetch: refetchPositions } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: closedPositions = [], isLoading: closedLoading, refetch: refetchClosedPositions } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

  // Listen for auto-refresh closed positions event
  useEffect(() => {
    const handleRefreshClosedPositions = () => {
      refetchClosedPositions();
    };

    window.addEventListener('refreshClosedPositions', handleRefreshClosedPositions);
    return () => window.removeEventListener('refreshClosedPositions', handleRefreshClosedPositions);
  }, [refetchClosedPositions]);

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

  const handleDeleteClosedPosition = async (positionId: string) => {
    try {
      const response = await fetch(`/api/closed-positions/${positionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Kapalı pozisyon silme başarısız');
      }

      toast({
        title: "Pozisyon Silindi",
        description: "Kapalı pozisyon başarıyla silindi",
      });

      // Refresh closed positions
      refetchClosedPositions();
    } catch (error) {
      console.error('Delete closed position error:', error);
      toast({
        title: "Hata",
        description: "Kapalı pozisyon silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iPhone-style Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">Portföy</h1>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-3 text-blue-600 hover:bg-blue-50 rounded-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-6 h-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-3 rounded-full ${
                viewMode === 'card' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="w-6 h-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-3 rounded-full ${
                viewMode === 'table' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('table')}
            >
              <Table2 className="w-6 h-6" />
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
            onClick={() => {
              setActiveTab('closed');
              refetchClosedPositions();
            }}
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
      <main className="pb-32">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium text-lg"
                  >
                    + Pozisyon Ekle
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {viewMode === 'card' ? (
                  filteredPositions.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      onRefresh={refetchPositions}
                      onClick={() => {
                        setSelectedPosition(position);
                        setShowDetailModal(true);
                      }}
                    />
                  ))
                ) : (
                  <PositionTable
                    positions={filteredPositions}
                    onRowClick={(position) => {
                      setSelectedPosition(position);
                      setShowDetailModal(true);
                    }}
                    onRefresh={refetchPositions}
                  />
                )}
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
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 mb-3"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base">{position.symbol}</h3>
                            <p className="text-sm text-gray-500">{position.name || position.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">₺{formatTurkishPrice(parseFloat(position.sellPrice))}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(position.sellDate).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">{position.type === 'fund' ? 'Pay' : 'Adet'}</p>
                          <p className="font-semibold text-gray-900">{position.quantity.toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Alış</p>
                          <p className="font-semibold text-gray-900">₺{formatTurkishPrice(parseFloat(position.buyPrice))}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Satış</p>
                          <p className="font-semibold text-gray-900">₺{formatTurkishPrice(parseFloat(position.sellPrice))}</p>
                        </div>
                      </div>
                      
                      {/* iOS-style Gradient K/Z Card */}
                      <div className={`rounded-xl p-4 mb-4 ${
                        parseFloat(position.pl) >= 0 
                          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border border-green-100'
                          : 'bg-gradient-to-br from-red-50 to-pink-100 border border-red-100'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Kar/Zarar:</span>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              parseFloat(position.pl) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {parseFloat(position.pl) >= 0 ? '+' : '-'}₺{formatTurkishPrice(Math.abs(parseFloat(position.pl)))}
                            </div>
                            <div className={`text-sm font-medium ${
                              parseFloat(position.plPercent) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {parseFloat(position.plPercent) >= 0 ? '+' : '-'}{Math.abs(parseFloat(position.plPercent)).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* iOS-style Action Button - Centered */}
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="lg"
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-3 rounded-xl font-medium border border-red-100"
                          onClick={() => handleDeleteClosedPosition(position.id)}
                        >
                          <Trash2 className="w-5 h-5 mr-2" />
                          SİL
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>



      {/* Add Position Modal */}
      <AddPositionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refetchPositions}
      />

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        open={showDetailModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowDetailModal(false);
            setSelectedPosition(null);
          }
        }}
        onUpdate={refetchPositions}
      />
    </div>
  );
}
