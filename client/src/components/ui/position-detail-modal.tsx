import { useState, useEffect } from "react";
import { Position } from "@shared/schema";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatTurkishPrice, parseTurkishPrice } from "@/lib/format";
import { Edit, Save, X, RefreshCw } from "lucide-react";

interface PositionDetailModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function PositionDetailModal({ position, open, onOpenChange, onUpdate }: PositionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'fund',
    quantity: '',
    buyPrice: '',
    buyDate: '',
    currentPrice: ''
  });

  // Update form data when position changes
  useEffect(() => {
    if (position) {
      setFormData({
        symbol: position.symbol,
        name: position.name || '',
        type: position.type as 'stock' | 'fund',
        quantity: position.quantity.toString(),
        buyPrice: formatTurkishPrice(parseFloat(position.buyPrice)),
        buyDate: new Date(position.buyDate).toISOString().split('T')[0],
        currentPrice: position.currentPrice ? formatTurkishPrice(parseFloat(position.currentPrice)) : ''
      });
    }
  }, [position]);

  const handleSave = async () => {
    if (!position) return;
    
    setSaving(true);
    try {
      const updateData = {
        symbol: formData.symbol,
        name: formData.name,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        buyPrice: parseTurkishPrice(formData.buyPrice).toString(),
        buyDate: formData.buyDate,
        currentPrice: formData.currentPrice ? parseTurkishPrice(formData.currentPrice).toString() : null
      };

      const response = await fetch(`/api/positions/${position.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Pozisyon güncelleme başarısız');
      }

      toast({
        title: "Başarılı",
        description: "Pozisyon bilgileri güncellendi",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Hata",
        description: "Pozisyon güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshPrice = async () => {
    if (!position) return;
    
    setIsRefreshingPrice(true);
    try {
      const response = await fetch(`/api/positions/${position.id}/update-price`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Fiyat güncelleme başarısız');
      }

      const updatedPosition = await response.json();
      
      setFormData(prev => ({
        ...prev,
        currentPrice: formatTurkishPrice(parseFloat(updatedPosition.currentPrice))
      }));

      toast({
        title: "Fiyat Güncellendi",
        description: `${position.symbol} güncel fiyatı alındı`,
      });

      onUpdate();
    } catch (error) {
      console.error('Price update error:', error);
      toast({
        title: "Hata",
        description: "Fiyat güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  if (!position) return null;

  const profit = position.currentPrice ? 
    (parseFloat(position.currentPrice) - parseFloat(position.buyPrice)) * position.quantity : 0;
  const profitPercent = position.currentPrice ? 
    ((parseFloat(position.currentPrice) - parseFloat(position.buyPrice)) / parseFloat(position.buyPrice)) * 100 : 0;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-auto max-h-[75vh] fixed bottom-0 left-0 right-0" style={{ marginTop: 'auto' }}>
          <div className="p-4 bg-white rounded-t-[10px] flex-1 max-h-[70vh] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
            <div className="text-center pb-4">
              <Drawer.Title className="text-lg font-semibold">
                Pozisyon Detayı
              </Drawer.Title>
              <Drawer.Description className="text-sm text-gray-600">{position.symbol}</Drawer.Description>
              {!isEditing && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-4 py-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Düzenle
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 drawer-content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sembol</Label>
                  {isEditing ? (
                    <Input
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="ULKER"
                    />
                  ) : (
                    <div className="text-lg font-semibold">{position.symbol}</div>
                  )}
                </div>
                
                <div>
                  <Label>Tür</Label>
                  {isEditing ? (
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: 'stock' | 'fund') => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Hisse</SelectItem>
                        <SelectItem value="fund">Fon</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {position.type === 'stock' ? 'Hisse' : 'Fon'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Şirket Adı</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ülker Bisküvi"
                  />
                ) : (
                  <div className="text-sm">{position.name || '-'}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Adet</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  ) : (
                    <div className="text-lg font-medium">{position.quantity}</div>
                  )}
                </div>

                <div>
                  <Label>Alış Tarihi</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.buyDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyDate: e.target.value }))}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {new Date(position.buyDate).toLocaleDateString('tr-TR')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alış Fiyatı</Label>
                  {isEditing ? (
                    <Input
                      value={formData.buyPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyPrice: e.target.value }))}
                      placeholder="109,50"
                    />
                  ) : (
                    <div className="text-lg font-medium">
                      {formatTurkishPrice(parseFloat(position.buyPrice))} TL
                    </div>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    Güncel Fiyat
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshPrice}
                      disabled={isRefreshingPrice}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshingPrice ? 'animate-spin' : ''}`} />
                    </Button>
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.currentPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentPrice: e.target.value }))}
                      placeholder="109,50"
                    />
                  ) : (
                    <div className="text-lg font-medium">
                      {position.currentPrice ? 
                        `${formatTurkishPrice(parseFloat(position.currentPrice))} TL` : 
                        '-'
                      }
                    </div>
                  )}
                </div>
              </div>

              {position.currentPrice && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kar/Zarar</Label>
                      <div className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : '-'}{formatTurkishPrice(Math.abs(profit))} TL
                      </div>
                    </div>
                    <div>
                      <Label>Getiri</Label>
                      <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitPercent >= 0 ? '+' : '-'}%{Math.abs(profitPercent).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Kaydet
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    İptal
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}