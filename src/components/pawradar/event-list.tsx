'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
}

export function EventList() {
  const dashboardVersion = usePawRadar((s) => s.dashboardVersion);
  const enterFanView = usePawRadar((s) => s.enterFanView);
  const [events, setEvents] = useState<DashboardEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/events')
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
      const res = await fetch(`/api/events/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev?.filter((e) => e.slug !== slug) ?? null);
      toast.success('已刪除');
    } catch {
      toast.error('刪除失敗');
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
            <p className="text-xs text-muted-foreground">
              唯一重要的 KPI：被加入日曆的次數
            </p>
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
                onPreview={() =>
                  enterFanView({
                    slug: e.slug,
                    petName: e.petName,
                    ownerHandle: e.ownerHandle,
                    walkStart: e.walkStart,
                    walkEnd: e.walkEnd,
                    location: e.location,
                    notes: e.notes,
                  })
                }
                onCopy={() => copyLink(e.slug)}
                onDelete={() => handleDelete(e.slug)}
              />
            ))}
          </div>
        )}
      </div>
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
        在左邊建立第一個散步事件，產生連結後就能放進 IG Link-in-bio
      </p>
    </div>
  );
}

interface EventCardProps {
  event: DashboardEvent;
  onPreview: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function EventCard({ event, onPreview, onCopy, onDelete }: EventCardProps) {
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
    <div className="group rounded-2xl border border-border bg-background/50 p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Date block */}
        <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
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
            <code className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              paw.rs/{event.slug}
            </code>
            <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
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
