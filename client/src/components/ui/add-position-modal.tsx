import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPositionSchema, type InsertPosition } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      includeCommission: false,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <DialogTitle className="text-xl font-semibold text-gray-900">Yeni Pozisyon</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="font-mono"
                    />
                  </FormControl>
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

            {/* Commission Toggle */}
            <FormField
              control={form.control}
              name="includeCommission"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium text-text-primary">
                    Komisyon dahil et
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
      </DialogContent>
    </Dialog>
  );
}
