import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import BookShelf from "@/components/diary/BookShelf";
import CreateBookDialog from "@/components/diary/CreateBookDialog";
import EditBookDialog from "@/components/diary/EditBookDialog";
import ScribeBookDialog from "@/components/diary/ScribeBookDialog";
import ReadBookDialog from "@/components/diary/ReadBookDialog";
import { useDiary, DiaryBook } from "@/hooks/useDiary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Diary = () => {
  const { books, loadingBooks, useBookEntries, createBook, deleteBook, addLinkedEntry, saveScribedContent, deleteEntry } = useDiary();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scribeDialogOpen, setScribeDialogOpen] = useState(false);
  const [readDialogOpen, setReadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<DiaryBook | null>(null);

  const { data: entries = [] } = useBookEntries(selectedBook?.id || null);

  const handleCreateBook = (title: string, color: string) => {
    createBook.mutate({ title, cover_color: color });
  };

  const handleEdit = (book: DiaryBook) => {
    setSelectedBook(book);
    setEditDialogOpen(true);
  };

  const handleScribe = (book: DiaryBook) => {
    setSelectedBook(book);
    setScribeDialogOpen(true);
  };

  const handleRead = (book: DiaryBook) => {
    setSelectedBook(book);
    setReadDialogOpen(true);
  };

  const handleDeleteClick = (book: DiaryBook) => {
    setSelectedBook(book);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBook) {
      deleteBook.mutate(selectedBook.id);
      setDeleteDialogOpen(false);
      setSelectedBook(null);
    }
  };

  const handleAddLink = (type: 'resource' | 'project' | 'task' | 'campaign', id: string, note: string) => {
    if (!selectedBook) return;
    
    addLinkedEntry.mutate({
      bookId: selectedBook.id,
      resourceId: type === 'resource' ? id : undefined,
      projectId: type === 'project' ? id : undefined,
      taskId: type === 'task' ? id : undefined,
      campaignId: type === 'campaign' ? id : undefined,
      note
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedBook) return;
    deleteEntry.mutate({ entryId, bookId: selectedBook.id });
  };

  const handleSaveScribed = (content: string) => {
    if (!selectedBook) return;
    saveScribedContent.mutate({ bookId: selectedBook.id, content });
  };

  return (
    <PageLayout title="Diary" subtitle="Your personal collection of tomes and reflections">
      <BookShelf
        books={books}
        onAddBook={() => setCreateDialogOpen(true)}
        onEdit={handleEdit}
        onScribe={handleScribe}
        onRead={handleRead}
        onDelete={handleDeleteClick}
      />

      <CreateBookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateBook}
      />

      <EditBookDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        book={selectedBook}
        entries={entries}
        onAddLink={handleAddLink}
        onDeleteEntry={handleDeleteEntry}
      />

      <ScribeBookDialog
        open={scribeDialogOpen}
        onOpenChange={setScribeDialogOpen}
        book={selectedBook}
        entries={entries}
        onSave={handleSaveScribed}
      />

      <ReadBookDialog
        open={readDialogOpen}
        onOpenChange={setReadDialogOpen}
        book={selectedBook}
        entries={entries}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="gothic-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel">Delete Book?</AlertDialogTitle>
            <AlertDialogDescription className="font-crimson">
              This will permanently delete "{selectedBook?.title}" and all its entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default Diary;
