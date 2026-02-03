import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DiaryBook {
  id: string;
  user_id: string;
  title: string;
  cover_color: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: string;
  book_id: string;
  entry_type: 'linked' | 'scribed';
  content: string | null;
  resource_id: string | null;
  project_id: string | null;
  task_id: string | null;
  campaign_id: string | null;
  note: string | null;
  page_number: number;
  created_at: string;
  // Joined data
  resource?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
  campaign?: { id: string; name: string } | null;
}

export const BOOK_COLORS = [
  { name: 'Crimson', value: '#8B0000' },
  { name: 'Midnight Blue', value: '#191970' },
  { name: 'Forest Green', value: '#228B22' },
  { name: 'Gold', value: '#DAA520' },
  { name: 'Purple', value: '#4B0082' },
  { name: 'Charcoal', value: '#36454F' },
];

export const useDiary = () => {
  const queryClient = useQueryClient();

  // Fetch all books
  const { data: books = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['diary-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DiaryBook[];
    }
  });

  // Fetch entries for a specific book
  const useBookEntries = (bookId: string | null) => {
    return useQuery({
      queryKey: ['diary-entries', bookId],
      queryFn: async () => {
        if (!bookId) return [];
        
        const { data, error } = await supabase
          .from('diary_entries')
          .select(`
            *,
            resource:resources(id, title),
            project:projects(id, name),
            task:tasks(id, title),
            campaign:campaigns(id, name)
          `)
          .eq('book_id', bookId)
          .order('page_number', { ascending: true });
        
        if (error) throw error;
        return data as DiaryEntry[];
      },
      enabled: !!bookId
    });
  };

  // Create book
  const createBook = useMutation({
    mutationFn: async ({ title, cover_color }: { title: string; cover_color: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('diary_books')
        .insert({ title, cover_color, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary-books'] });
      toast.success("Book created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create book: " + error.message);
    }
  });

  // Delete book
  const deleteBook = useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('diary_books')
        .delete()
        .eq('id', bookId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary-books'] });
      toast.success("Book deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete book: " + error.message);
    }
  });

  // Add linked entry
  const addLinkedEntry = useMutation({
    mutationFn: async ({ 
      bookId, 
      resourceId, 
      projectId, 
      taskId, 
      campaignId, 
      note 
    }: { 
      bookId: string; 
      resourceId?: string; 
      projectId?: string; 
      taskId?: string; 
      campaignId?: string;
      note?: string;
    }) => {
      // Get next page number
      const { data: entries } = await supabase
        .from('diary_entries')
        .select('page_number')
        .eq('book_id', bookId)
        .order('page_number', { ascending: false })
        .limit(1);
      
      const nextPage = entries && entries.length > 0 ? entries[0].page_number + 1 : 0;

      const { data, error } = await supabase
        .from('diary_entries')
        .insert({
          book_id: bookId,
          entry_type: 'linked',
          resource_id: resourceId || null,
          project_id: projectId || null,
          task_id: taskId || null,
          campaign_id: campaignId || null,
          note: note || null,
          page_number: nextPage
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diary-entries', variables.bookId] });
      toast.success("Entry linked to book");
    },
    onError: (error) => {
      toast.error("Failed to add entry: " + error.message);
    }
  });

  // Save scribed content (splits by === and creates multiple entries)
  const saveScribedContent = useMutation({
    mutationFn: async ({ bookId, content }: { bookId: string; content: string }) => {
      // First, delete existing scribed entries
      await supabase
        .from('diary_entries')
        .delete()
        .eq('book_id', bookId)
        .eq('entry_type', 'scribed');

      // Get max page number from linked entries
      const { data: linkedEntries } = await supabase
        .from('diary_entries')
        .select('page_number')
        .eq('book_id', bookId)
        .eq('entry_type', 'linked')
        .order('page_number', { ascending: false })
        .limit(1);
      
      const startPage = linkedEntries && linkedEntries.length > 0 
        ? linkedEntries[0].page_number + 1 
        : 0;

      // Split content by === on its own line
      const pages = content.split(/\n===\n/).filter(p => p.trim());
      
      if (pages.length === 0) return;

      const entries = pages.map((pageContent, index) => ({
        book_id: bookId,
        entry_type: 'scribed' as const,
        content: pageContent.trim(),
        page_number: startPage + index
      }));

      const { error } = await supabase
        .from('diary_entries')
        .insert(entries);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diary-entries', variables.bookId] });
      toast.success("Content saved");
    },
    onError: (error) => {
      toast.error("Failed to save content: " + error.message);
    }
  });

  // Delete entry
  const deleteEntry = useMutation({
    mutationFn: async ({ entryId, bookId }: { entryId: string; bookId: string }) => {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      return bookId;
    },
    onSuccess: (bookId) => {
      queryClient.invalidateQueries({ queryKey: ['diary-entries', bookId] });
      toast.success("Entry removed");
    },
    onError: (error) => {
      toast.error("Failed to delete entry: " + error.message);
    }
  });

  return {
    books,
    loadingBooks,
    useBookEntries,
    createBook,
    deleteBook,
    addLinkedEntry,
    saveScribedContent,
    deleteEntry
  };
};
