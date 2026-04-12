import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { insertPositionSchema, type InsertPosition } from "@shared/schema";
import { DrawerModal } from './drawer-modal';
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
  const [assetType, setAssetType] = useState<'stock' | 'fund' | 'us_stock'>('stock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertPosition>({
    resolver: zodResolver(insertPositionSchema),
    defaultValues: {
      symbol: '',
      name: '',
      type: 'stock',
      quantity: '1',
      buyPrice: '',
      buyRate: '1.0',
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
    <DrawerModal 
      open={open} 
      onOpenChange={onOpenChange}
      title="Yeni Pozisyon"
      description="Portföyünüze yeni bir yatırım pozisyonu ekleyin"
    >

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Asset Type Selection */}
            <div>
              <FormLabel className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                Varlık Türü
              </FormLabel>
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      assetType === 'stock' 
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md border border-blue-200 dark:border-blue-700/50' 
                        : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
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
                    className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      assetType === 'fund' 
                        ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-md border border-green-200 dark:border-green-700/50' 
                        : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                    onClick={() => {
                      setAssetType('fund');
                      form.setValue('type', 'fund');
                    }}
                  >
                    Fon
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      assetType === 'us_stock' 
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-md border border-purple-200 dark:border-purple-700/50' 
                        : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                    onClick={() => {
                      setAssetType('us_stock');
                      form.setValue('type', 'us_stock');
                    }}
                  >
                    ABD Hisse
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
                      placeholder={assetType === 'stock' ? 'Örn: GARAN, AKBNK' : (assetType === 'us_stock' ? 'Örn: AAPL, TSLA' : 'Örn: TFF, AFT')}
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
                      placeholder={assetType === 'stock' ? 'Örn: Garanti BBVA' : (assetType === 'us_stock' ? 'Örn: Apple Inc.' : 'Örn: TEFAS Fon')}
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
                      type="text"
                      placeholder="Örn: 10,5 veya 1"
                      className="font-mono"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleaned = value.replace(/[^0-9,.]/g, '');
                        field.onChange(cleaned);
                      }}
                      onFocus={(e) => {
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
                  <FormLabel className="text-gray-900 dark:text-white">Alış Fiyatı ({assetType === 'us_stock' ? '$' : '₺'})</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="0,60 veya 106,80"
                      className="font-mono"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleaned = value.replace(/[^0-9,.]/g, '');
                        field.onChange(cleaned);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </FormControl>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Örnek: {assetType === 'us_stock' ? '150,45' : (assetType === 'stock' ? '106,80' : '0,60')}
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
    </DrawerModal>
  );
}
