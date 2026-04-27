import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      position="top-center"
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast !rounded-2xl !p-4 !gap-3 !border !shadow-[0_18px_40px_-12px_hsl(260_60%_30%/0.25)] backdrop-blur-xl backdrop-saturate-150 !bg-[hsl(var(--glass-bg))] !border-[hsl(var(--glass-border))] !text-foreground",
          title: "!font-bold !text-sm !tracking-tight",
          description: "!text-xs !text-muted-foreground",
          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-xl",
          cancelButton:
            "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-xl",
          success:
            "!border-[hsl(190_95%_50%/0.4)] !bg-[linear-gradient(135deg,hsl(190_95%_50%/0.12),hsl(320_90%_58%/0.10))] !text-foreground",
          error:
            "!border-destructive/40 !bg-[linear-gradient(135deg,hsl(0_75%_55%/0.12),hsl(320_90%_58%/0.08))] !text-foreground",
          info:
            "!border-primary/30 !bg-[hsl(var(--glass-bg))]",
          icon: "!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
