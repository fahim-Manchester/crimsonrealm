import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { DiaryBook, DiaryEntry } from "@/hooks/useDiary";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Map, Flame, Globe, Trash2 } from "lucide-react";

interface EditBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: DiaryBook | null;
  entries: DiaryEntry[];
  onAddLink: (type: 'resource' | 'project' | 'task' | 'campaign', id: string, note: string) => void;
  onDeleteEntry: (entryId: string) => void;
}

const EditBookDialog = ({ 
  open, 
  onOpenChange, 
  book, 
  entries,
  onAddLink,
  onDeleteEntry 
}: EditBookDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, { type: string; note: string }>>({});

  // Fetch resources
  const { data: resources = [] } = useQuery({
    queryKey: ['resources-for-diary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('id, title');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-diary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-for-diary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('id, title');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-for-diary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('id, name');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const linkedEntries = entries.filter(e => e.entry_type === 'linked');

  const isLinked = (type: string, id: string) => {
    return linkedEntries.some(e => {
      if (type === 'resource') return e.resource_id === id;
      if (type === 'project') return e.project_id === id;
      if (type === 'task') return e.task_id === id;
      if (type === 'campaign') return e.campaign_id === id;
      return false;
    });
  };

  const getLinkedEntry = (type: string, id: string) => {
    return linkedEntries.find(e => {
      if (type === 'resource') return e.resource_id === id;
      if (type === 'project') return e.project_id === id;
      if (type === 'task') return e.task_id === id;
      if (type === 'campaign') return e.campaign_id === id;
      return false;
    });
  };

  const handleToggleItem = (type: 'resource' | 'project' | 'task' | 'campaign', id: string) => {
    const existingEntry = getLinkedEntry(type, id);
    if (existingEntry) {
      onDeleteEntry(existingEntry.id);
    } else {
      onAddLink(type, id, '');
    }
  };

  const renderItemList = (
    items: { id: string; title?: string; name?: string }[],
    type: 'resource' | 'project' | 'task' | 'campaign',
    icon: React.ReactNode
  ) => (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 font-crimson italic">
            No items found
          </p>
        ) : (
          items.map((item) => {
            const linked = isLinked(type, item.id);
            return (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
              >
                <Checkbox
                  checked={linked}
                  onCheckedChange={() => handleToggleItem(type, item.id)}
                />
                <span className="text-muted-foreground">{icon}</span>
                <span className="font-crimson flex-1">
                  {item.title || item.name}
                </span>
                {linked && (
                  <Badge variant="outline" className="text-xs">Linked</Badge>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gothic-card border-primary/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Link Entries to "{book.title}"
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chronicles" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="chronicles" className="font-cinzel text-xs">
              Chronicles
            </TabsTrigger>
            <TabsTrigger value="territories" className="font-cinzel text-xs">
              Territories
            </TabsTrigger>
            <TabsTrigger value="forge" className="font-cinzel text-xs">
              Forge
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="font-cinzel text-xs">
              Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chronicles" className="mt-4">
            {renderItemList(resources, 'resource', <BookMarked className="h-4 w-4" />)}
          </TabsContent>

          <TabsContent value="territories" className="mt-4">
            {renderItemList(projects, 'project', <Map className="h-4 w-4" />)}
          </TabsContent>

          <TabsContent value="forge" className="mt-4">
            {renderItemList(tasks, 'task', <Flame className="h-4 w-4" />)}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4">
            {renderItemList(campaigns, 'campaign', <Globe className="h-4 w-4" />)}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBookDialog;
