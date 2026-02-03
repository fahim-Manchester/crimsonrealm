import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiaryBook, DiaryEntry } from "@/hooks/useDiary";
import { BookOpen, ChevronLeft, ChevronRight, BookMarked, Map, Flame, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BookSlider, { Page } from "@/components/ui/book-slider";

interface ReadBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: DiaryBook | null;
  entries: DiaryEntry[];
}

const ReadBookDialog = ({ 
  open, 
  onOpenChange, 
  book, 
  entries 
}: ReadBookDialogProps) => {
  const bookRef = useRef<any>(null);

  const getEntryIcon = (entry: DiaryEntry) => {
    if (entry.resource_id) return <BookMarked className="h-4 w-4" />;
    if (entry.project_id) return <Map className="h-4 w-4" />;
    if (entry.task_id) return <Flame className="h-4 w-4" />;
    if (entry.campaign_id) return <Globe className="h-4 w-4" />;
    return null;
  };

  const getEntryType = (entry: DiaryEntry) => {
    if (entry.resource_id) return 'Chronicle';
    if (entry.project_id) return 'Territory';
    if (entry.task_id) return 'Forge';
    if (entry.campaign_id) return 'Campaign';
    return null;
  };

  const getEntryTitle = (entry: DiaryEntry) => {
    if (entry.resource) return entry.resource.title;
    if (entry.project) return entry.project.name;
    if (entry.task) return entry.task.title;
    if (entry.campaign) return entry.campaign.name;
    return 'Unknown';
  };

  const handlePrevPage = () => {
    bookRef.current?.pageFlip()?.flipPrev();
  };

  const handleNextPage = () => {
    bookRef.current?.pageFlip()?.flipNext();
  };

  if (!book) return null;

  const sortedEntries = [...entries].sort((a, b) => a.page_number - b.page_number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gothic-card border-primary/30 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Reading "{book.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {sortedEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-crimson text-muted-foreground italic text-lg">
                This book is empty. Add some entries or scribe your thoughts.
              </p>
            </div>
          ) : (
            <>
              <BookSlider ref={bookRef} width={350} height={450}>
                {/* Cover page */}
                <Page className="flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="font-cinzel text-2xl mb-4" style={{ color: book.cover_color }}>
                      {book.title}
                    </h2>
                    <div className="w-16 h-px bg-current/30 mx-auto mb-4" />
                    <p className="font-crimson italic text-sm">
                      {sortedEntries.length} {sortedEntries.length === 1 ? 'page' : 'pages'}
                    </p>
                  </div>
                </Page>

                {/* Content pages */}
                {sortedEntries.map((entry, index) => (
                  <Page key={entry.id}>
                    <div className="h-full flex flex-col">
                      {/* Page header */}
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-current/20">
                        {entry.entry_type === 'linked' ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getEntryIcon(entry)}
                            {getEntryType(entry)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Scribed</Badge>
                        )}
                        <span className="text-xs opacity-50">Page {index + 1}</span>
                      </div>

                      {/* Page content */}
                      <div className="flex-1 overflow-hidden">
                        {entry.entry_type === 'linked' ? (
                          <div className="space-y-4">
                            <h3 className="font-cinzel text-lg font-semibold">
                              {getEntryTitle(entry)}
                            </h3>
                            {entry.note && (
                              <p className="font-crimson italic text-sm leading-relaxed">
                                "{entry.note}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="font-crimson text-sm leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </Page>
                ))}

                {/* Back cover */}
                <Page className="flex items-center justify-center">
                  <div className="text-center opacity-50">
                    <p className="font-crimson italic">The End</p>
                  </div>
                </Page>
              </BookSlider>

              {/* Navigation */}
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" onClick={handlePrevPage}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReadBookDialog;
