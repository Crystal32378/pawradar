'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  Instagram,
  MapPin,
  PawPrint,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { usePawRadar } from '@/store/pawradar';
import { toast } from 'sonner';
import { isOnesignalEnabled } from '@/lib/onesignal-config';
import { NotifyOptInDialog } from './notify-opt-in-dialog';

interface FanEvent {
  slug: string;
  petName: string;
  ownerHandle: string;
  walkStart: string;
  walkEnd: string;
  location: string;
  notes: string | null;
  addCount?: number;
  status: 'active' | 'cancelled';
}

/**
 * The fan-facing view. Mimics an iOS calendar invite card.
 * Golden path: tap "加入日曆" → .ics download → native calendar prompt.
 */
export function FanInvite({ initialEvent }: { initialEvent?: FanEvent }) {
  const slug = usePawRadar((s) => s.fanEvent?.slug ?? initialEvent?.slug);
  const exitFanView = usePawRadar((s) => s.exitFanView);
  const [event, setEvent] = useState<FanEvent | null>(initialEvent ?? null);
  const [loading, setLoading] = useState(!initialEvent);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setEvent(initialEvent);
      setLoading(false);
      return;
    }
    if (!slug) {
      setLoading(false);
      setError('找不到這個散步事件');
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/events/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEvent(data.event);
      })
      .catch(() => {
        if (cancelled) return;
        setError('這個散步連結已失效或不存在');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialEvent]);

  const handleAddToCalendar = async () => {
    if (!event) return;
    setAdding(true);
    // Trigger the .ics download. iOS Safari will recognise text/calendar
    // and prompt the user to add it to the native calendar. The ICS endpoint
    // itself bumps the addCount KPI — no need to double-track here.
    try {
      // Small delay so the user sees the loading state.
      await new Promise((r) => setTimeout(r, 400));
      window.location.href = `/api/ics/${event.slug}`;
      toast.success('已啟動日曆邀請 — 請在跳出的視窗按下「加入」');
      // After ICS download initiates, show opt-in dialog if feature flag on.
      // Delay slightly so the download toast is visible first.
      if (isOnesignalEnabled) {
        setTimeout(() => setShowNotifyDialog(true), 1500);
      }
    } catch {
      toast.error('下載失敗，請再試一次');
    } finally {
      setTimeout(() => setAdding(false), 1200);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <X size={28} />
        </div>
        <h2 className="mt-4 text-xl font-semibold">連結失效</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? '找不到這個散步事件'}
        </p>
        <Button
          onClick={() => {
            exitFanView();
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('event');
              window.history.replaceState({}, '', url.toString());
            }
          }}
          className="mt-6 rounded-full"
        >
          回到主控台
        </Button>
      </div>
    );
  }

  const start = new Date(event.walkStart);
  const end = new Date(event.walkEnd);
  const sameDay = start.toDateString() === end.toDateString();

  const weekday = start.toLocaleDateString('zh-TW', { weekday: 'long' });
  const monthDay = start.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
  });
  const startTime = start.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = end.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="relative">
      {/* Backdrop */}
      <div className="paw-grid-bg absolute inset-0 opacity-50" aria-hidden />

      <div className="relative mx-auto max-w-md px-4 py-8 sm:py-12">
        {/* Tiny label mimicking iOS calendar invite header */}
        <div className="paw-rise mb-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles size={13} className="text-accent-foreground" />
          散步邀請
        </div>

        {/* The invite card */}
        <div className="paw-rise overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
          {/* Header strip */}
          <div className="relative bg-gradient-to-br from-primary to-primary/80 px-6 py-7 text-primary-foreground">
            <div className="paw-grid-bg absolute inset-0 opacity-20" aria-hidden />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur">
                <PawPrint size={11} />
                PawRadar 邀請
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-tight">
                  {event.status === 'cancelled' ? `${event.petName}的散步已取消` : `${event.petName}的散步時間`}
              </h1>
              <p className="mt-1 text-xs text-primary-foreground/80">
                主理人 {event.ownerHandle}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5">
            <DetailRow
              icon={<CalendarPlus size={15} />}
              label="時間"
              primary={`${weekday} · ${monthDay}`}
              secondary={
                sameDay
                  ? `${startTime} - ${endTime}`
                  : `${startTime} ~ ${monthDay} ${endTime}`
              }
            />
            <DetailRow
              icon={<MapPin size={15} />}
              label="預計地點"
              primary={event.location}
            />
            {event.notes && (
              <DetailRow
                icon={<Sparkles size={15} />}
                label="備註"
                primary={event.notes}
              />
            )}
          </div>

          {/* Add to calendar CTA */}
          <div className="border-t border-border bg-secondary/30 px-6 py-5">
            <Button
              onClick={handleAddToCalendar}
              disabled={adding || event.status === 'cancelled'}
              size="lg"
              className="w-full gap-2 rounded-2xl bg-primary py-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              {event.status === 'cancelled' ? (
                <>活動已取消</>
              ) : adding ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  準備日曆邀請中…
                </>
              ) : (
                <>
                  <CalendarPlus size={20} />
                  加入日曆
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              免註冊・免下載
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <TrustItem icon={<ShieldCheck size={14} />} label="隱私安全" />
          <TrustItem icon={<Clock size={14} />} label="原生日曆" />
          <TrustItem icon={<Instagram size={14} />} label="寄生 IG" />
        </div>

        {/* Footer line */}
        <div className="mt-6 text-center text-[11px] text-muted-foreground">
          PawRadar
        </div>
      </div>

      {/* OneSignal opt-in dialog — only renders when feature flag enabled.
          Shows after ICS download. See notify-opt-in-dialog.tsx */}
      {event && (
        <NotifyOptInDialog
          eventSlug={event.slug}
          petName={event.petName}
          open={showNotifyDialog}
          onOpenChange={setShowNotifyDialog}
        />
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground">{primary}</div>
        {secondary && (
          <div className="mt-0.5 text-xs text-muted-foreground">{secondary}</div>
        )}
      </div>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card/60 px-2 py-2.5">
      <span className="text-accent-foreground">{icon}</span>
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
