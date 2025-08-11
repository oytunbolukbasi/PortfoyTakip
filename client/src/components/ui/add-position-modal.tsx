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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 drawer-content">
            {/* Asset Type Selection */}
            <div>
              <FormLabel className="text-sm font-medium text-text-primary mb-2 block">
                Varlık Türü
              </FormLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={assetType === 'stock' ? 'default' : 'outline'}
                  className={`p-3 h-auto ${
                    assetType === 'stock' 
                      ? 'bg-primary text-white border-primary' 
                      : 'border-gray-300 text-text-primary'
                  }`}
                  onClick={() => {
                    setAssetType('stock');
                    form.setValue('type', 'stock');
                  }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  BIST Hisse
                </Button>
                <Button
                  type="button"
                  variant={assetType === 'fund' ? 'default' : 'outline'}
                  className={`p-3 h-auto ${
                    assetType === 'fund' 
                      ? 'bg-primary text-white border-primary' 
                      : 'border-gray-300 text-text-primary'
                  }`}
                  onClick={() => {
                    setAssetType('fund');
                    form.setValue('type', 'fund');
                  }}
                >
                  <Percent className="w-4 h-4 mr-2" />
                  TEFAS Fon
                </Button>
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
                      placeholder={assetType === 'stock' ? 'Örn: GARAN, AKBNK' : 'Örn: TFF, AFT'}
                      className="uppercase"
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
                      placeholder={assetType === 'stock' ? 'Örn: Garanti BBVA' : 'Örn: TEFAS Fon'}
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
                      placeholder="1"
                      className="font-mono"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                      onFocus={(e) => {
                        // Select all text on focus so user can overwrite
                        e.target.select();
                      }}
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
                      value={field.value || ''}
                      onChange={(e) => {
                        // Allow Turkish format with comma as decimal separator
                        const value = e.target.value;
                        // Only allow numbers, comma, and thousand separator dot
                        const cleaned = value.replace(/[^0-9,.]/g, '');
                        field.onChange(cleaned);
                      }}
                      onFocus={(e) => {
                        // Select all text on focus so user can overwrite
                        e.target.select();
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
            <Button 
              type="submit" 
              className="w-full bg-primary text-white hover:bg-primary-dark"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ekleniyor...' : 'Pozisyon Ekle'}
            </Button>
          </form>
        </Form>
    </FullScreenModal>
  );
}
