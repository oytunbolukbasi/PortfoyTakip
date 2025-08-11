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
import { X } from "lucide-react";
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
              <FormLabel className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                Varlık Türü
              </FormLabel>
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                      assetType === 'stock' 
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => {
                      setAssetType('stock');
                      form.setValue('type', 'stock');
                    }}
                  >
                    Hisse
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                      assetType === 'fund' 
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => {
                      setAssetType('fund');
                      form.setValue('type', 'fund');
                    }}
                  >
                    Fon
                  </Button>
                </div>
              </div>
            </div>

            {/* Symbol Input */}
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-white">Varlık Kodu</FormLabel>
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
                  <FormLabel className="text-gray-900 dark:text-white">Varlık Adı (Opsiyonel)</FormLabel>
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
                  <FormLabel className="text-gray-900 dark:text-white">{assetType === 'fund' ? 'Pay Adedi' : 'Adet'}</FormLabel>
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
                  <FormLabel className="text-gray-900 dark:text-white">Alış Fiyatı (₺)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="0,60 veya 106,80"
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Örnek: 0,60 (fonlar) veya 106,80 (hisseler)
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
                  <FormLabel className="text-gray-900 dark:text-white">Alış Tarihi</FormLabel>
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
              className="w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl py-3 font-semibold border border-gray-200 dark:border-gray-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ekleniyor...' : 'Pozisyon Ekle'}
            </Button>
          </form>
        </Form>
    </FullScreenModal>
  );
}
