/**
 * Validation schema for creating a PawRadar event.
 * Shared between the client form (for live validation) and the
 * server API (for authoritative validation).
 */
import { z } from 'zod';

export const createEventSchema = z.object({
  petName: z
    .string()
    .trim()
    .min(1, '請輸入寵物名字')
    .max(40, '名字太長了（最多 40 字）'),
  ownerHandle: z
    .string()
    .trim()
    .min(1, '請輸入 IG 帳號')
    .max(60, '帳號太長了')
    .refine(
      (v) => !v.includes(' '),
      'IG 帳號不能包含空白',
    ),
  walkStart: z
    .string()
    .min(1, '請選擇散步開始時間'),
  durationMinutes: z
    .number()
    .int()
    .min(15, '至少 15 分鐘')
    .max(480, '最多 8 小時'),
  location: z
    .string()
    .trim()
    .min(1, '請輸入預計地點')
    .max(120, '地點太長了'),
  notes: z
    .string()
    .trim()
    .max(280, '備註最多 280 字')
    .optional()
    .or(z.literal('')),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
