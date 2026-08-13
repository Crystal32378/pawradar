'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  Copy,
  Eye,
  Inbox,
  MapPin,
  PawPrint,
  Trash2,
  TrendingUp,
  Check,
  Ban,
  Loader2,
  Pencil,
} from 'lucide-react';
import { usePawRadar } from '@/store/pawradar';
import { toast } from 'sonner';

interface DashboardEvent {
  slug: string;
  petName: string;
  ownerHandle: string;
  walkStart: string;
  walkEnd: string;
  location: string;
  notes: string | null;
  addCount: number;
  createdAt: string;
  status: 'active' | 'cancelled';
}

export function EventList() {
  const dashboardVersion = usePawRadar((s) => s.dashboardVersion);
  const router = useRouter();
  const [events, setEvents] = useState<DashboardEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DashboardEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/dashboard/events')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('讀取事件清單失敗');
        setEvents([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardVersion]);

  const handleDelete = async (slug: string) => {
    if (!confirm('確定要刪除這個散步連結？')) return;
    try {
      const res = await fetch(`/api/dashboard/events/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev?.filter((e) => e.slug !== slug) ?? null);
      toast.success('已刪除');
    } catch {
      toast.error('刪除失敗');
    }
  };

  const saveEvent = async (
    slug: string,
    body: Record<string, unknown>,
    notifyType?: 'reschedule' | 'cancel' | 'update',
  ) => {
    const response = await fetch(`/api/dashboard/events/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? '更新失敗');
    setEvents((current) =>
      current?.map((event) => (event.slug === slug ? data.event : event)) ?? null,
    );

    if (notifyType) {
      const notification = await fetch(`/api/dashboard/notify/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: notifyType }),
      });
      if (notification.ok) {
        const result = await notification.json();
        return result.sent > 0
          ? `已更新，並通知 ${result.sent} 位訂閱者`
          : '已更新，目前沒有訂閱者';
      }
      if (notification.status !== 501) return '資料已更新，但通知暫時未送出';
    }
    return '已更新';
  };

  const handleCancel = async (event: DashboardEvent) => {
    if (!confirm(`確定取消「${event.petName}」這場散步？粉絲將無法再下載日曆。`)) return;
    try {
      const message = await saveEvent(event.slug, { status: 'cancelled' }, 'cancel');
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消失敗');
    }
  };

  const copyLink = async (slug: string) => {
    const realLink = `${window.location.origin}/?event=${slug}`;
    try {
      await navigator.clipboard.writeText(realLink);
      toast.success('已複製連結');
    } catch {
      toast.error('複製失敗');
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">你的散步連結</h2>
            <p className="text-xs text-muted-foreground">唯一 KPI：被加入日曆次數</p>
          </div>
        </div>
        {events && events.length > 0 && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            共 {events.length} 個
          </span>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-h-[28rem] space-y-3 overflow-y-auto paw-scroll pr-1">
            {events.map((e) => (
              <EventCard
                key={e.slug}
                event={e}
                onPreview={() => {
                  // Navigate to public fan view (root with ?event=slug)
                  // The fan view renders server-side from this URL — no client
                  // state sharing needed between /dashboard and /.
                  router.push(`/?event=${e.slug}`);
                }}
                onCopy={() => copyLink(e.slug)}
                onEdit={() => setEditing(e)}
                onCancel={() => handleCancel(e)}
                onDelete={() => handleDelete(e.slug)}
              />
            ))}
          </div>
        )}
      </div>
      <EditEventDialog
        event={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          const message = await saveEvent(editing.slug, body, 'reschedule');
          toast.success(message);
          setEditing(null);
        }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Inbox size={26} />
      </div>
      <h3 className="mt-4 text-sm font-semibold">還沒有散步連結</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        在左邊建立第一個
      </p>
    </div>
  );
}

interface EventCardProps {
  event: DashboardEvent;
  onPreview: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function EventCard({ event, onPreview, onCopy, onEdit, onCancel, onDelete }: EventCardProps) {
  const [copied, setCopied] = useState(false);
  const start = new Date(event.walkStart);
  const monthDay = `${start.getMonth() + 1}月${start.getDate()}日`;
  const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`group rounded-2xl border bg-card p-4 transition-all hover:shadow-sm ${event.status === 'cancelled' ? 'border-destructive/30 opacity-70' : 'border-border hover:border-primary/40'}`}>
      <div className="flex items-start gap-3">
        {/* Date block */}
        <div className="flex h-[3.2rem] w-[3.2rem] flex-shrink-0 flex-col items-center justify-center rounded-[0.7rem] bg-primary/10 text-primary">
          <span className="text-[10px] font-medium uppercase leading-none">
            {monthDay.split('月')[0]}月
          </span>
          <span className="text-xl font-bold leading-tight">
            {start.getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PawPrint size={14} className="text-primary" />
            <span className="truncate font-semibold">{event.petName}</span>
            {event.status === 'cancelled' && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">已取消</span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="truncate text-xs text-muted-foreground">
              {event.ownerHandle}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={12} />
              {monthDay} · {time}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {event.location}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground break-all">
              ?event={event.slug}
            </code>
            <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <TrendingUp size={11} />
              {event.addCount} 次加入
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          onClick={onPreview}
          className="gap-1.5 rounded-full bg-primary px-4 text-primary-foreground"
        >
          <Eye size={14} />
          粉絲預覽
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="gap-1.5 rounded-full"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已複製' : '複製連結'}
        </Button>
        {event.status === 'active' && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5 rounded-full">
              <Pencil size={14} />
              改期
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 rounded-full text-muted-foreground hover:text-destructive">
              <Ban size={14} />
              取消活動
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="ml-auto gap-1.5 rounded-full text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} />
          刪除
        </Button>
      </div>
    </div>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EditEventDialog({
  event,
  onOpenChange,
  onSave,
}: {
  event: DashboardEvent | null;
  onOpenChange: (open: boolean) => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  if (!event) return null;
  const durationMinutes = Math.max(
    15,
    Math.round((new Date(event.walkEnd).getTime() - new Date(event.walkStart).getTime()) / 60_000),
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>更新散步時間</DialogTitle>
          <DialogDescription>儲存後，已訂閱的粉絲才會收到與最新資料一致的通知。</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (submitEvent) => {
            submitEvent.preventDefault();
            const form = new FormData(submitEvent.currentTarget);
            setSaving(true);
            try {
              await onSave({
                walkStart: String(form.get('walkStart')),
                durationMinutes: Number(form.get('durationMinutes')),
                location: String(form.get('location')),
                notes: String(form.get('notes')),
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : '更新失敗');
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-walk-start">新日期與時間</Label>
              <Input id="edit-walk-start" name="walkStart" type="datetime-local" defaultValue={toDateTimeLocal(event.walkStart)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-duration">時長（分鐘）</Label>
              <Input id="edit-duration" name="durationMinutes" type="number" min={15} max={480} defaultValue={durationMinutes} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-location">地點</Label>
            <Input id="edit-location" name="location" defaultValue={event.location} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">備註</Label>
            <Textarea id="edit-notes" name="notes" defaultValue={event.notes ?? ''} maxLength={280} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>先不要</Button>
            <Button type="submit" disabled={saving} className="gap-2 rounded-full">
              {saving && <Loader2 size={15} className="animate-spin" />}
              儲存並通知
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
