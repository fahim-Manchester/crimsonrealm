import { Pencil, Feather, BookOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BookCardProps {
  id: string;
  title: string;
  coverColor: string;
  onEdit: () => void;
  onScribe: () => void;
  onRead: () => void;
  onDelete: () => void;
}

const BookCard = ({ 
  title, 
  coverColor, 
  onEdit, 
  onScribe, 
  onRead,
  onDelete 
}: BookCardProps) => {
  return (
    <div className="group relative flex flex-col items-center">
      {/* Book visual */}
      <div 
        className={cn(
          "relative w-28 h-40 rounded-r-md rounded-l-sm shadow-lg cursor-pointer",
          "transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2",
          "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-3",
          "before:bg-black/20 before:rounded-l-sm"
        )}
        style={{ backgroundColor: coverColor }}
      >
        {/* Book spine decoration */}
        <div className="absolute left-1 top-2 bottom-2 w-1 bg-white/10 rounded" />
        <div className="absolute left-3 top-0 bottom-0 w-px bg-black/10" />
        
        {/* Title on spine */}
        <div className="absolute left-4 top-4 bottom-4 w-20 flex items-center justify-center">
          <span 
            className="font-cinzel text-xs text-white/90 writing-mode-vertical transform rotate-180 text-center line-clamp-3 drop-shadow-md"
            style={{ writingMode: 'vertical-rl' }}
          >
            {title}
          </span>
        </div>

        {/* Decorative lines */}
        <div className="absolute right-2 top-3 w-8 h-px bg-white/20" />
        <div className="absolute right-2 bottom-3 w-8 h-px bg-white/20" />
      </div>

      {/* Action buttons - appear on hover */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-muted/80 hover:bg-primary/20"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit Links</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-muted/80 hover:bg-primary/20"
              onClick={onScribe}
            >
              <Feather className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scribe</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-muted/80 hover:bg-primary/20"
              onClick={onRead}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Read</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 bg-destructive/20 hover:bg-destructive/40"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default BookCard;
