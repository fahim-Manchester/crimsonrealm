import { Palette, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { THEME_IDS, THEMES } from "@/lib/themes";
import { useState } from "react";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-sm hover:bg-primary/10 transition-colors"
          title="Switch Theme"
        >
          <Palette className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cinzel tracking-wider">Choose Your Realm</DialogTitle>
          <DialogDescription className="font-crimson text-muted-foreground">
            Switch the look and feel. Your data stays the same.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const isActive = theme === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
                className={`relative rounded-sm border-2 p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
                  isActive
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary/30"
                    : "border-border/50 bg-card/60 hover:border-primary/40"
                }`}
              >
                {/* Color swatches */}
                <div className="flex gap-1.5 mb-3">
                  {t.previewColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {/* Name */}
                <div className="font-cinzel text-sm font-semibold tracking-wide text-foreground mb-1">
                  {t.displayName}
                </div>
                {/* Description */}
                <div className="text-xs text-muted-foreground leading-snug">
                  {t.description}
                </div>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSwitcher;
