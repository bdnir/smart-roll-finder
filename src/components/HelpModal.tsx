import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">איך זה עובד?</DialogTitle>
          <DialogDescription className="text-right">
            הסבר קצר על אופן השימוש באפליקציה
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground leading-relaxed text-right">
          <p>
            <strong>📸 מצלמים:</strong> מכוונים את המצלמה למוצר (חשוב שהמשקל/מס׳
            יחידות יופיעו בבירור, גם המחיר). אח״כ אפשר לתקן ידנית.
          </p>
          <p>
            <strong>⚖️ משווים:</strong> המערכת תזהה את כל הווריאציות ותחשב עבורך
            את המחיר ליחידת מידה אחידה.
          </p>
          <p>
            <strong>💰 חוסכים:</strong> המוצר המשתלם ביותר יסומן בירוק – פשוט
            ומהיר.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
