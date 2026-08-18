'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PawRadarLogo } from '@/components/pawradar/logo';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    igHandle: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error ?? '建立帳號失敗';
        setError(msg);
        toast.error(msg);
        return;
      }
      // Auto-login after signup
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!loginRes.ok) {
        toast.error('帳號已建立，請手動登入');
        router.push('/login');
        return;
      }
      toast.success('歡迎加入 PawRadar！');
      router.push(getReturnPath());
      router.refresh();
    } catch {
      setError('網路錯誤，請再試一次');
      toast.error('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_8px_24px_oklch(0.53_0.16_35/0.07)] sm:p-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <PawRadarLogo size="md" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">建立創作者帳號</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            開始建立你的散步連結
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              創作者名稱
            </Label>
            <Input
              id="name"
              required
              autoComplete="name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="igHandle" className="text-xs font-medium text-muted-foreground">
              IG 帳號（選填）
            </Label>
            <Input
              id="igHandle"
              placeholder="@corgi_mochi"
              autoComplete="username"
              value={form.igHandle}
              onChange={(e) => setForm({ ...form, igHandle: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              密碼（至少 8 字元，含英數）
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-background"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 rounded-full bg-primary py-3 text-primary-foreground shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                建立中…
              </>
            ) : (
              <>
                <UserPlus size={16} />
                建立帳號
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          已有帳號？{' '}
          <Link href="/login?from=%2Fdashboard" className="font-medium text-primary hover:underline">
            登入
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <SignupForm />;
}

function getReturnPath(): string {
  const requested = new URLSearchParams(window.location.search).get('from');
  return requested?.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/dashboard';
}
