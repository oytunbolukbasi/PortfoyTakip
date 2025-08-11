import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPositionSchema, type InsertPosition } from "@shared/schema";
import { FullScreenModal } from './full-screen-modal';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, TrendingUp, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AddPositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddPositionModal({ open, onOpenChange, onSuccess }: AddPositionModalProps) {
  const [assetType, setAssetType] = useState<'stock' | 'fund'>('stock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertPosition>({
    resolver: zodResolver(insertPositionSchema),
    defaultValues: {
      symbol: '',
      name: '',
      type: 'stock',
      quantity: 1,
      buyPrice: '',
      buyDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: InsertPosition) => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/positions', {
        ...data,
        type: assetType,
        symbol: data.symbol.toUpperCase(),
      });
      
      onSuccess();
      onOpenChange(false);
      form.reset();
      
      toast({
        title: "Pozisyon eklendi",
        description: `${data.symbol.toUpperCase()} pozisyonu başarıyla eklendi.`,
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Pozisyon eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setAssetType('stock');
  };

  return (
    <FullScreenModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Yeni Pozisyon"
      description="Portföyünüze yeni bir yatırım pozisyonu ekleyin"
    >

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Asset Type Selection */}
            <div className="bg-gray-50 rounded-xl p-4">
              <FormLabel className="text-sm font-medium text-gray-700 mb-3 block">
                Yatırım Türü
              </FormLabel>
              <div className="flex bg-white rounded-lg p-1 border">
                <button
                  type="button"
                  onClick={() => {
                    setAssetType('stock');
                    form.setValue('type', 'stock');
                  }}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all ${
                    assetType === 'stock'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  BIST Hisse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssetType('fund');
                    form.setValue('type', 'fund');
                  }}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all ${
                    assetType === 'fund'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Percent className="w-4 h-4 inline mr-2" />
                  TEFAS Fon
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {assetType === 'stock' 
                  ? 'Borsa İstanbul\'da işlem gören hisse senetleri (ör: ULKER, GARAN, ENKAI)'
                  : 'TEFAS\'ta kayıtlı yatırım fonları (ör: TGY, IGY, AGY)'
                }
              </div>
            </div>

            {/* Symbol Input */}
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varlık Kodu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={assetType === 'stock' ? 'Örn: ULKER, GARAN, ENKAI' : 'Örn: TGY, IGY, AGY'}
                      className="uppercase text-lg font-medium"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Input */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varlık Adı (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder={assetType === 'stock' ? 'Örn: Ülker Bisküvi Sanayi A.Ş.' : 'Örn: Türkiye Garanti Yatırım Fonu'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity Input */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{assetType === 'fund' ? 'Pay Adedi' : 'Adet'}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      className="font-mono"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buy Price Input */}
            <FormField
              control={form.control}
              name="buyPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alış Fiyatı (₺)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="106,80"
                      className="font-mono"
                      onChange={(e) => {
                        // Allow Turkish format with comma as decimal separator
                        const value = e.target.value;
                        // Only allow numbers, comma, and thousand separator dot
                        const cleaned = value.replace(/[^0-9,.]/g, '');
                        field.onChange(cleaned);
                      }}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground mt-1">
                    Örnek: 106,80 veya 1.205,50
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buy Date Input */}
            <FormField
              control={form.control}
              name="buyDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alış Tarihi</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Submit Button */}
            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 text-white hover:bg-blue-700 h-12 text-base font-medium shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ekleniyor...' : 'Pozisyon Ekle'}
              </Button>
            </div>
          </form>
        </Form>
    </FullScreenModal>
  );
}
