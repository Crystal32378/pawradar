'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, Loader2, Apple, Info, X } from 'lucide-react';
import { isOnesignalEnabled } from '@/lib/onesignal-config';
import { initOnesignal, promptForSubscription } from '@/lib/onesignal-client';
import { toast } from 'sonner';

interface NotifyOptInDialogProps {
  eventSlug: string;
  petName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Post-ICS opt-in dialog for OneSignal Web Push.
 *
 * Behavior:
 *   1. Only renders when feature flag is enabled (NEXT_PUBLIC_ONESIGNAL_APP_ID)
 *   2. Fan must explicitly tap "接收通知" — no auto-prompt
 *   3. On tap: initialise SDK, ask for browser permission, get playerId,
 *      POST to /api/subscriptions to record the opt-in
 *   4. If permission denied: dismiss gracefully, ICS already done
 *   5. iOS limitation note: clearly explained in the dialog body
 */
export function NotifyOptInDialog({
  eventSlug,
  petName,
  open,
  onOpenChange,
}: NotifyOptInDialogProps) {
  const [subscribing, setSubscribing] = useState(false);

  // Hard gate — dialog should never even be opened when flag is off,
  // but this is a defense-in-depth check
  if (!isOnesignalEnabled) return null;

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const inited = await initOnesignal();
      if (!inited) {
        toast.error('通知初始化失敗，請稍後再試');
        onOpenChange(false);
        return;
      }
      const playerId = await promptForSubscription();
      if (!playerId) {
        // User dismissed browser permission prompt or denied
        toast.info('沒關係，日曆提醒仍會運作');
        onOpenChange(false);
        return;
      }

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, eventSlug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? '訂閱失敗');
        onOpenChange(false);
        return;
      }

      toast.success(`已為「${petName}的散步」開啟通知`);
      onOpenChange(false);
    } catch (err) {
      console.error('[PawRadar] subscribe failed:', err);
      toast.error('發生錯誤，請稍後再試');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                接收改期或取消通知？
              </DialogTitle>
              <DialogDescription className="text-xs">
                {petName}的散步若有異動，主理人會主動通知你
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-6 pb-2">
          {/* iOS limitation note — clearly disclosed */}
          <div className="flex gap-2 rounded-xl bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
            <Apple size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">iPhone 使用者注意</p>
              <p className="mt-0.5 leading-relaxed">
                iOS 16.4 以上需先「加入主畫面」成 Web App 才能接收通知。
                若你的 iOS 不支援，日曆提醒仍會正常運作。
              </p>
            </div>
          </div>

          {/* Privacy note */}
          <div className="flex gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              訂閱後可隨時關閉。PawRadar 不會知道你的精確位置，
              主理人只能發送該場散步的改期或取消通知。
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-6 pt-2">
          <Button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full gap-2 rounded-full bg-primary py-3 text-primary-foreground"
          >
            {subscribing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                要求權限中…
              </>
            ) : (
              <>
                <Bell size={16} />
                接收通知
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={subscribing}
            className="w-full gap-1.5 rounded-full text-muted-foreground"
          >
            <X size={14} />
            不用了，日曆提醒就夠
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
