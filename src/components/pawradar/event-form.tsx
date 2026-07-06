'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  Check,
  Instagram,
  Loader2,
  MapPin,
  PawPrint,
  StickyNote,
} from 'lucide-react';
import { createEventSchema, type CreateEventInput } from '@/lib/validations';
import { usePawRadar } from '@/store/pawradar';
import { toast } from 'sonner';

interface CreatedEvent {
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

/** Returns a datetime-local string for "now + 2 hours" as default form value. */
function defaultWalkStart(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // Round to nearest 15 minutes.
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function EventForm() {
  const bumpDashboard = usePawRadar((s) => s.bumpDashboard);
  const enterFanView = usePawRadar((s) => s.enterFanView);
  const [created, setCreated] = useState<CreatedEvent | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      petName: '',
      ownerHandle: '',
      walkStart: defaultWalkStart(),
      durationMinutes: 60,
      location: '',
      notes: '',
    },
  });

  const duration = watch('durationMinutes');

  const onSubmit = async (data: CreateEventInput) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.issues?.[0]?.message ?? json?.error ?? '建立失敗，請再試一次';
        toast.error(msg);
        return;
      }
      setCreated(json.event as CreatedEvent);
      bumpDashboard();
      toast.success('散步連結建立成功！');
    } catch (err) {
      console.error(err);
      toast.error('網路錯誤，請再試一次');
    }
  };

  const handleReset = () => {
    setCreated(null);
    reset({
      petName: '',
      ownerHandle: '',
      walkStart: defaultWalkStart(),
      durationMinutes: 60,
      location: '',
      notes: '',
    });
  };

  if (created) {
    return <CreatedPanel event={created} onAnother={handleReset} onPreview={() => enterFanView({
      slug: created.slug,
      petName: created.petName,
      ownerHandle: created.ownerHandle,
      walkStart: created.walkStart,
      walkEnd: created.walkEnd,
      location: created.location,
      notes: created.notes,
    })} />;
  }

  return (
    <form
      id="create"
      onSubmit={handleSubmit(onSubmit)}
      className="scroll-mt-20 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PawPrint size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">建立散步連結</h2>
          <p className="text-xs text-muted-foreground">放進 IG 個人簡介即可</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="寵物名字" error={errors.petName?.message} icon={<PawPrint size={14} />}>
          <Input
            placeholder="例：麻糬"
            className="bg-background"
            {...register('petName')}
          />
        </Field>

        <Field
          label="IG 帳號"
          error={errors.ownerHandle?.message}
          icon={<Instagram size={14} />}
        >
          <Input
            placeholder="@corgi_mochi"
            className="bg-background"
            {...register('ownerHandle')}
          />
        </Field>

        <Field
          label="散步開始時間"
          error={errors.walkStart?.message}
          icon={<CalendarClock size={14} />}
        >
          <Input
            type="datetime-local"
            className="bg-background"
            {...register('walkStart')}
          />
        </Field>

        <Field label="散步時長" error={errors.durationMinutes?.message}>
          <Select
            value={String(duration)}
            onValueChange={(v) => setValue('durationMinutes', Number(v), { shouldValidate: true })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="選擇時長" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 分鐘</SelectItem>
              <SelectItem value="60">1 小時</SelectItem>
              <SelectItem value="90">1.5 小時</SelectItem>
              <SelectItem value="120">2 小時</SelectItem>
              <SelectItem value="180">3 小時</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="預計地點"
            error={errors.location?.message}
            icon={<MapPin size={14} />}
          >
            <Input
              placeholder="例：大安森林公園"
              className="bg-background"
              {...register('location')}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="備註（選填）"
            error={errors.notes?.message}
            icon={<StickyNote size={14} />}
          >
            <Textarea
              placeholder="例：穿紅色牽繩"
              className="min-h-20 resize-none bg-background"
              {...register('notes')}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2 rounded-full bg-primary px-6 text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              建立中…
            </>
          ) : (
            <>
              <CalendarClock size={16} />
              產生連結
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CreatedPanel({
  event,
  onAnother,
  onPreview,
}: {
  event: CreatedEvent;
  onAnother: () => void;
  onPreview: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // Cosmetic paw.rs/<slug> link — the real shareable URL is the page itself
  // with the ?event=<slug> query parameter, but the brand link is what
  // users put in their IG bio.
  const brandLink = `paw.rs/${event.slug}`;
  const realLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?event=${event.slug}`
      : `/?event=${event.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(realLink);
      setCopied(true);
      toast.success('已複製連結到剪貼簿');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('複製失敗，請手動選取複製');
    }
  };

  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Check size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">連結建立成功！</h2>
          <p className="text-xs text-muted-foreground">放進 IG 個人簡介即可</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-lg font-semibold text-primary">
            {brandLink}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={copyLink}
            variant="outline"
            className="gap-1.5 rounded-full"
          >
            {copied ? <Check size={14} /> : null}
            {copied ? '已複製' : '複製連結'}
          </Button>
        </div>
        <div className="mt-2 break-all rounded-lg bg-background/60 px-2.5 py-1.5 text-[10px] text-muted-foreground">
          {realLink}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="寵物" value={event.petName} />
        <Stat label="地點" value={event.location} />
        <Stat label="主理人" value={event.ownerHandle} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPreview}
          className="gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          預覽邀請卡
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAnother}
          className="gap-2 rounded-full"
        >
          再建一個
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
