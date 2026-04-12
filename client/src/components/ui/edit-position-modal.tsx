import { useState, useEffect } from "react";
import { Position } from "@shared/schema";
import { FullScreenModal } from "./full-screen-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EditPositionModalProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPositionModal({
  position,
  open,
  onOpenChange,
  onSuccess,
}: EditPositionModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState("");

  // Pre-fill fields whenever position changes or modal opens
  useEffect(() => {
    if (position && open) {
      setQuantity(
        parseFloat(position.quantity).toLocaleString("tr-TR", {
          maximumFractionDigits: 10,
        })
      );
      setBuyPrice(
        parseFloat(position.buyPrice).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
      );
      setBuyDate(
        new Date(position.buyDate).toISOString().split("T")[0]
      );
    }
  }, [position, open]);

  if (!position) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, buyPrice, buyDate }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Güncelleme başarısız");
      }

      toast({ title: "Güncellendi", description: `${position.symbol} pozisyonu güncellendi.` });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currency = position.type === "us_stock" ? "$" : "₺";

  return (
    <FullScreenModal
      open={open}
      onOpenChange={onOpenChange}
      title={`${position.symbol} Düzenle`}
      description={position.name || "Pozisyon bilgilerini güncelle"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="edit-quantity">
            {position.type === "fund" ? "Pay Adedi" : "Adet"}
          </Label>
          <Input
            id="edit-quantity"
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-buy-price">Alış Fiyatı ({currency})</Label>
          <Input
            id="edit-buy-price"
            type="text"
            inputMode="decimal"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="0,00"
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-buy-date">Alış Tarihi</Label>
          <Input
            id="edit-buy-date"
            type="date"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full py-3"
          >
            İptal
          </Button>
        </div>
      </form>
    </FullScreenModal>
  );
}
