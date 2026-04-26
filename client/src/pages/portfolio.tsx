import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Position, ClosedPosition } from "@shared/schema";
import PortfolioSummary from "@/components/ui/portfolio-summary";
import PositionCard from "@/components/ui/position-card";

import AddPositionModal from "@/components/ui/add-position-modal";
import { PositionDetailModal } from "@/components/ui/position-detail-modal";
import { PositionTable } from "@/components/ui/position-table";
import { ClosedPositionTable } from "@/components/ui/closed-position-table";

import { LayoutGrid, Table2, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
    refetchInterval: 30000,
  });

  const { data: closedPositions = [], isLoading: closedLoading, refetch: refetchClosedPositions } = useQuery<ClosedPosition[]>({
    queryKey: ['/api/closed-positions'],
  });

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
        description: "Fiyatlar güncellendi",
      });
    } catch (error) {
      toast({
        description: "Fiyatlar güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* iPhone-style Navigation Bar (Borderless & Translucent) */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center justify-between px-5 h-16">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Portföy</h1>
          
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-12 h-12 p-0 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 hover:bg-subtle"
              onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
            >
              {viewMode === 'card' ? (
                <Table2 className="w-7 h-7 text-text-secondary" strokeWidth={2.5} />
              ) : (
                <LayoutGrid className="w-7 h-7 text-text-secondary" strokeWidth={2.5} />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Portfolio Summary */}
      <PortfolioSummary positions={positions} closedPositions={closedPositions} />

      {/* iPhone-style Segmented Control */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-md transition-all ${
              activeTab === 'active'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Aktif
          </button>
          <button
            className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-md transition-all ${
              activeTab === 'closed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
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
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Arama"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-muted border-0 rounded-lg text-foreground placeholder-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-32 relative">
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
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-gray-400">
                    <path d="M11,2V22C5.9,21.5 2,17.2 2,12S5.9,2.5 11,2M13,2V11H22C22,6.8 18.2,3 13,2M13,13V22C18.1,21.5 22,17.2 22,13H13Z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'Sonuç Bulunamadı' : 'Henüz Pozisyon Yok'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-base">
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
                      onCloseDetail={() => setShowDetailModal(false)}
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
                    onCloseDetail={() => setShowDetailModal(false)}
                  />
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'closed' && (
          <div className="px-4">
             <ClosedPositionTable
                closedPositions={filteredClosedPositions}
                onRefresh={refetchClosedPositions}
              />
          </div>
        )}
      </main>
      {/* --- END STEP 2 --- */}

      <AddPositionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refetchPositions}
      />

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
