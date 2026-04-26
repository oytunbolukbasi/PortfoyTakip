import { Drawer } from 'vaul';
import { Edit2, X, Trash2 } from 'lucide-react';

interface PositionActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onClosePosition: () => void;
  onDelete: () => void;
  positionSymbol: string;
}

export function PositionActionSheet({
  isOpen,
  onClose,
  onEdit,
  onClosePosition,
  onDelete,
  positionSymbol
}: PositionActionSheetProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 flex flex-col bg-card rounded-t-[20px] outline-none z-50">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border-default mt-4 mb-6" />
          
          <div className="px-4 pb-8">
            <p className="text-xs font-semibold text-text-secondary px-4 mb-2 uppercase tracking-wider">
              {positionSymbol} İşlemleri
            </p>
            
            <div className="space-y-1">
              {/* Düzenle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  onClose();
                }}
                className="w-full flex items-center gap-3 h-14 px-4 text-left text-text-primary hover:bg-subtle rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <span className="text-base font-medium">Pozisyonu Düzenle</span>
              </button>

              {/* Kapat */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClosePosition();
                  onClose();
                }}
                className="w-full flex items-center gap-3 h-14 px-4 text-left text-text-primary hover:bg-subtle rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                <span className="text-base font-medium">Pozisyonu Kapat</span>
              </button>

              {/* Divider */}
              <div className="h-px bg-border-light my-2 mx-4" />

              {/* Sil */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  onClose();
                }}
                className="w-full flex items-center gap-3 h-14 px-4 text-left text-error-500 hover:bg-error-100/50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-error-100 flex items-center justify-center text-error-500">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-base font-medium">Pozisyonu Sil</span>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-full h-14 text-center text-text-primary font-bold mt-4 bg-subtle rounded-xl transition-colors"
            >
              İptal
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
