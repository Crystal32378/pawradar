'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PawRadarLogo } from '@/components/pawradar/logo';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? '登入失敗');
        toast.error(data?.error ?? '登入失敗');
        return;
      }
      toast.success('登入成功');
      router.push(from);
      router.refresh();
    } catch {
      setError('網路錯誤');
      toast.error('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <PawRadarLogo size="md" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">創作者登入</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的散步連結與 KPI
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
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              密碼
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                登入中…
              </>
            ) : (
              <>
                <LogIn size={16} />
                登入
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          還沒有帳號？{' '}
          <Link href={`/signup?from=${encodeURIComponent(from)}`} className="font-medium text-primary hover:underline">
            建立創作者帳號
          </Link>
        </div>
        <div className="mt-3 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12">載入中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
