import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: InsertPosition & { type: string; symbol: string }) => {
      const res = await apiRequest('POST', '/api/positions', data);
      return res.json();
    },
    onMutate: async (newPosition) => {
      await queryClient.cancelQueries({ queryKey: ['/api/positions'] });

      const previousPositions = queryClient.getQueryData(['/api/positions']);

      const optimisticId = Date.now();
      
      const normalizedQuantity = String(newPosition.quantity).replace(/\./g, '').replace(',', '.');
      const normalizedBuyPrice = String(newPosition.buyPrice).replace(/\./g, '').replace(',', '.');

      const optimisticObj = {
        id: optimisticId,
        symbol: newPosition.symbol,
        name: newPosition.name || '',
        type: newPosition.type,
        quantity: normalizedQuantity,
        buyPrice: normalizedBuyPrice,
        buyRate: newPosition.buyRate || '1.0',
        buyDate: newPosition.buyDate,
        currentPrice: null,
        lastUpdated: new Date().toISOString(),
        userId: 'demo-user'
      };

      queryClient.setQueryData(['/api/positions'], (old: any) => {
        if (!old) return [optimisticObj];
        return [...old, optimisticObj];
      });

      return { previousPositions };
    },
    onError: (err, newPosition, context) => {
      if (context?.previousPositions) {
        queryClient.setQueryData(['/api/positions'], context.previousPositions);
      }
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Pozisyon eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Pozisyon eklendi",
        description: `${variables.symbol} pozisyonu başarıyla eklendi.`,
      });
      onSuccess();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
    },
  });

  const onSubmit = (data: InsertPosition) => {
    mutation.mutate({
      ...data,
      type: assetType,
      symbol: data.symbol.toUpperCase(),
    });
    
    // Formu hemen kapat ve sıfırla (Optimistic UX)
    onOpenChange(false);
    form.reset();
    setAssetType('stock');
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col relative">
            <div className="space-y-4 overflow-y-auto max-h-[65dvh] px-1 pb-10">
            {/* Asset Type Selection */}
            <div>
              <FormLabel className="text-sm font-medium text-text-primary mb-3 block">
                Varlık Türü
              </FormLabel>
              <div className="bg-subtle p-1 rounded-xl">
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      assetType === 'stock' 
                        ? 'bg-card text-primary-500 shadow-md border border-primary-500/20' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-card/50'
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
                        ? 'bg-card text-success-500 shadow-md border border-success-500/20' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-card/50'
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
                        ? 'bg-card text-insight shadow-md border border-insight/20' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-card/50'
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
                  <FormLabel className="text-text-primary">Varlık Kodu</FormLabel>
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
                  <FormLabel className="text-text-primary">Varlık Adı (Opsiyonel)</FormLabel>
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
                  <FormLabel className="text-text-primary">{assetType === 'fund' ? 'Pay Adedi' : 'Adet'}</FormLabel>
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
                  <FormLabel className="text-text-primary">Alış Fiyatı ({assetType === 'us_stock' ? '$' : '₺'})</FormLabel>
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
                  <FormLabel className="text-text-primary">Alış Tarihi</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="block w-full min-w-0 appearance-none bg-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            </div>

            {/* Submit Button */}
            <div 
              className="px-4 pt-4 -mx-4 mt-2 bg-card border-t border-border sticky bottom-[-max(1.5rem,env(safe-area-inset-bottom))] z-10"
              style={{
                marginBottom: 'calc(-1 * max(1.5rem, env(safe-area-inset-bottom)))',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)'
              }}
            >
              <Button 
                type="submit" 
                className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-xl py-3 font-semibold transition-colors shadow-sm"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Ekleniyor...' : 'Pozisyon Ekle'}
              </Button>
            </div>
          </form>
        </Form>
    </DrawerModal>
  );
}
