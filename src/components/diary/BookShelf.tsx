import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookCard from "./BookCard";
import { DiaryBook } from "@/hooks/useDiary";

interface BookShelfProps {
  books: DiaryBook[];
  onAddBook: () => void;
  onEdit: (book: DiaryBook) => void;
  onScribe: (book: DiaryBook) => void;
  onRead: (book: DiaryBook) => void;
  onDelete: (book: DiaryBook) => void;
}

const BookShelf = ({ 
  books, 
  onAddBook, 
  onEdit, 
  onScribe, 
  onRead,
  onDelete 
}: BookShelfProps) => {
  return (
    <div className="space-y-8">
      {/* Shelf with books */}
      <div className="relative">
        {/* Books container */}
        <div className="flex flex-wrap gap-8 items-end justify-start min-h-[200px] pb-16 px-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              coverColor={book.cover_color}
              onEdit={() => onEdit(book)}
              onScribe={() => onScribe(book)}
              onRead={() => onRead(book)}
              onDelete={() => onDelete(book)}
            />
          ))}
          
          {/* Add book button */}
          <Button
            variant="outline"
            className="w-28 h-40 border-dashed border-2 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
            onClick={onAddBook}
          >
            <Plus className="h-8 w-8" />
            <span className="font-crimson text-sm">Add Book</span>
          </Button>
        </div>

        {/* Shelf wood */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-primary/60 to-primary/80 rounded-sm shadow-lg" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/40" />
      </div>

      {/* Empty state */}
      {books.length === 0 && (
        <div className="text-center py-8">
          <p className="font-crimson text-muted-foreground italic">
            Your bookshelf awaits its first tome...
          </p>
        </div>
      )}
    </div>
  );
};

export default BookShelf;
