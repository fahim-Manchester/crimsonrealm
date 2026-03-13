import { useMemo, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import type { CampaignItem } from "@/hooks/useCampaigns";
import { SortableTaskItem } from "@/components/campaigns/SortableTaskItem";

type DropId = string;
const nestId = (itemId: string) => `nest:${itemId}`;

function isNestDropId(id: DropId): id is `nest:${string}` {
  return typeof id === "string" && id.startsWith("nest:");
}

function unwrapNestDropId(id: `nest:${string}`) {
  return id.slice("nest:".length);
}

function buildChildrenMap(items: CampaignItem[]) {
  const map = new Map<string, CampaignItem[]>();
  for (const item of items) {
    if (!item.parent_item_id) continue;
    const list = map.get(item.parent_item_id) || [];
    list.push(item);
    map.set(item.parent_item_id, list);
  }
  return map;
}

function getIndentLevel(item: CampaignItem, byId: Map<string, CampaignItem>) {
  let level = 0;
  let cursor = item;
  const guard = new Set<string>();
  while (cursor.parent_item_id) {
    if (guard.has(cursor.id)) break;
    guard.add(cursor.id);
    level += 1;
    const parent = byId.get(cursor.parent_item_id);
    if (!parent) break;
    cursor = parent;
  }
  return level;
}

function sumDescendantSeconds(
  itemId: string,
  childrenMap: Map<string, CampaignItem[]>,
  getOwnSeconds: (item: CampaignItem) => number,
  byId: Map<string, CampaignItem>
) {
  const root = byId.get(itemId);
  if (!root) return 0;

  let sum = getOwnSeconds(root);
  const stack = [...(childrenMap.get(itemId) || [])];
  const guard = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (guard.has(cur.id)) continue;
    guard.add(cur.id);

    sum += getOwnSeconds(cur);
    const children = childrenMap.get(cur.id);
    if (children?.length) stack.push(...children);
  }

  return sum;
}

interface QuestItemListProps {
  items: CampaignItem[];
  currentIndex: number;
  itemSessionTimes: Record<string, number>;
  onSelectIndex: (index: number) => void;
  onReorder: (newItems: CampaignItem[]) => void;
  onSetParent: (itemId: string, parentItemId: string | null) => void;
  onUncheckItem: (itemId: string) => void;
  onUpdateTime: (itemId: string, minutes: number) => void;
  onMarkPermanent?: (itemId: string) => void;
  onSetTargetTime?: (itemId: string, seconds: number) => void;
  onRemoveTargetTime?: (itemId: string) => void;
  targetTimes?: Record<string, number>;
  timedTaskId?: string | null;
  selectedTaskId?: string | null;
  isTimerRunning?: boolean;
}

export function QuestItemList({
  items,
  currentIndex,
  itemSessionTimes,
  onSelectIndex,
  onReorder,
  onSetParent,
  onUncheckItem,
  onUpdateTime,
  onMarkPermanent,
  onSetTargetTime,
  onRemoveTargetTime,
  targetTimes = {},
  timedTaskId,
  selectedTaskId,
  isTimerRunning = false,
}: QuestItemListProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const childrenMap = useMemo(() => buildChildrenMap(items), [items]);

  const getOwnSeconds = (item: CampaignItem) => (item.time_spent || 0) + (itemSessionTimes[item.id] || 0);

  const aggregatedSecondsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (!childrenMap.has(item.id)) continue;
      map.set(item.id, sumDescendantSeconds(item.id, childrenMap, getOwnSeconds, byId));
    }
    return map;
  }, [items, childrenMap, byId, itemSessionTimes]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // Nesting drop target - drop on right side of an item
    if (isNestDropId(overId)) {
      const parentId = unwrapNestDropId(overId);
      if (parentId !== activeId) {
        onSetParent(activeId, parentId);
      }
      return;
    }

    // Plain sortable reorder - only within same level
    const activeItem = byId.get(activeId);
    const overItem = byId.get(overId);
    if (!activeItem || !overItem) return;
    
    // Only reorder if both items have the same parent (same level)
    if (activeItem.parent_item_id !== overItem.parent_item_id) return;

    const oldIndex = items.findIndex((i) => i.id === activeId);
    const newIndex = items.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder(newItems);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const isDragActive = activeDragId !== null;

  return (
    <div className="relative">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 relative">
            {items.map((item, index) => {
              const indentLevel = getIndentLevel(item, byId);
              const displaySeconds = aggregatedSecondsById.get(item.id) ?? getOwnSeconds(item);
              const hasChildren = childrenMap.has(item.id);

              // Single source of truth for UI highlight:
              // 1) If a timed item exists, highlight it (running or paused)
              // 2) Otherwise, highlight the selected item (if provided)
              // 3) Otherwise, fall back to the currentIndex item (legacy)
              const fallbackId = items[currentIndex]?.id;
              const activeItemId = timedTaskId ?? selectedTaskId ?? fallbackId;
              const isActive = !!activeItemId && item.id === activeItemId;

              return (
                <SortableTaskItem
                  key={item.id}
                  item={item}
                  isCurrentTask={isActive}
                  isSelected={isActive}
                  isTimerRunning={isTimerRunning}
                  indentLevel={indentLevel}
                  showAggregatedTime={hasChildren}
                  displayTimeSeconds={displaySeconds}
                  onSelect={() => onSelectIndex(index)}
                  onUncheck={() => onUncheckItem(item.id)}
                  onUnembed={indentLevel > 0 ? () => onSetParent(item.id, null) : undefined}
                  onUpdateTime={(mins) => onUpdateTime(item.id, mins)}
                  onMarkPermanent={item.is_temporary && onMarkPermanent ? () => onMarkPermanent(item.id) : undefined}
                  onSetTargetTime={onSetTargetTime ? (secs) => onSetTargetTime(item.id, secs) : undefined}
                  onRemoveTargetTime={onRemoveTargetTime ? () => onRemoveTargetTime(item.id) : undefined}
                  targetTimeSeconds={targetTimes[item.id]}
                  sessionTimeSeconds={itemSessionTimes[item.id] || 0}
                  nestDropId={nestId(item.id)}
                  isDragActive={isDragActive}
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeDragId ? (() => {
            const dragItem = byId.get(activeDragId);
            const dragTitle = dragItem?.is_temporary 
              ? dragItem.temporary_name 
              : (dragItem?.task?.title || dragItem?.project?.name);
            return (
              <div className="p-3 rounded-sm border border-primary bg-card/90 shadow-lg opacity-90">
                <span className="font-crimson text-sm">
                  {dragTitle || "Item"}
                </span>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
