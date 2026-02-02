import { ReactNode, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Scissors, MoreVertical, GripVertical, Check, X } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface EntryGroup {
  id: string;
  name: string;
}

interface GroupedDataTableProps<T extends { id: string; group_id?: string | null }> {
  data: T[];
  columns: Column<T>[];
  groups: EntryGroup[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDismantleGroup?: (groupId: string) => void;
  onMoveEntry?: (entryId: string, groupId: string | null) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  emptyMessage?: string;
}

function GroupedDataTable<T extends { id: string; group_id?: string | null }>({
  data,
  columns,
  groups,
  onEdit,
  onDelete,
  onDismantleGroup,
  onMoveEntry,
  onRenameGroup,
  emptyMessage = "No entries found.",
}: GroupedDataTableProps<T>) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

  // Separate ungrouped entries and grouped entries
  const ungroupedData = data.filter((item) => !item.group_id);
  const groupedData = groups.map((group) => ({
    ...group,
    entries: data.filter((item) => item.group_id === group.id),
  }));

  const handleDragStart = (entryId: string) => {
    setDraggedEntryId(entryId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (groupId: string | null) => {
    if (draggedEntryId && onMoveEntry) {
      onMoveEntry(draggedEntryId, groupId);
    }
    setDraggedEntryId(null);
  };

  const startRename = (group: EntryGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const saveRename = () => {
    if (editingGroupId && editingName.trim() && onRenameGroup) {
      onRenameGroup(editingGroupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingGroupId(null);
    setEditingName("");
  };

  const renderTableRows = (items: T[], isGrouped: boolean = false) => {
    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length + (onEdit || onDelete ? 1 : 0) + (onMoveEntry ? 1 : 0)}
            className="text-center py-8 font-crimson text-muted-foreground italic"
          >
            {isGrouped ? "No entries in this group" : emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return items.map((item) => (
      <TableRow
        key={item.id}
        className="border-border/20 hover:bg-primary/5"
        draggable={!!onMoveEntry}
        onDragStart={() => handleDragStart(item.id)}
      >
        {onMoveEntry && (
          <TableCell className="w-8 cursor-grab">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell key={String(column.key)} className="font-crimson">
            {column.render
              ? column.render(item)
              : String((item as Record<string, unknown>)[column.key as string] ?? "")}
          </TableCell>
        ))}
        {(onEdit || onDelete) && (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(item)}
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  const renderTable = (items: T[], groupName?: string, groupId?: string, isGrouped: boolean = false) => (
    <div
      className={`gothic-card overflow-hidden ${draggedEntryId ? "ring-2 ring-primary/30" : ""}`}
      onDragOver={handleDragOver}
      onDrop={() => handleDrop(groupId || null)}
    >
      {groupName && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-primary/5">
          {editingGroupId === groupId ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-8 text-sm bg-background/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") cancelRename();
                }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveRename}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelRename}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-cinzel text-sm tracking-wide text-foreground">
                {groupName}
                <span className="ml-2 text-xs text-muted-foreground font-crimson">
                  ({items.length})
                </span>
              </h3>
              {groupId && onDismantleGroup && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startRename({ id: groupId, name: groupName })}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDismantleGroup(groupId)}
                      className="text-destructive"
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Dismantle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            {onMoveEntry && <TableHead className="w-8" />}
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className="font-cinzel text-foreground tracking-wide"
              >
                {column.label}
              </TableHead>
            ))}
            {(onEdit || onDelete) && (
              <TableHead className="font-cinzel text-foreground tracking-wide text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableRows(items, isGrouped)}</TableBody>
      </Table>
    </div>
  );

  // If no groups exist, show single table
  if (groups.length === 0) {
    return renderTable(data);
  }

  return (
    <div className="space-y-6">
      {/* Ungrouped entries (Primary Table) */}
      {ungroupedData.length > 0 && renderTable(ungroupedData, "Ungrouped", undefined, false)}

      {/* Grouped entries */}
      {groupedData.map((group) => (
        <div key={group.id}>
          {renderTable(group.entries, group.name, group.id, true)}
        </div>
      ))}

      {/* Show primary table even if empty when groups exist */}
      {ungroupedData.length === 0 && groups.length > 0 && (
        <div
          className="gothic-card p-8 text-center border-dashed border-2 border-border/30"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(null)}
        >
          <p className="font-crimson text-muted-foreground italic">
            Drag entries here to ungroup them
          </p>
        </div>
      )}
    </div>
  );
}

export default GroupedDataTable;
