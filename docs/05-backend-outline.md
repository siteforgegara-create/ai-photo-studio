# 05 — Набросок бэкенда (для согласования mock-типов)

**Не реализовывать на этапах фронтенда.** Документ нужен, чтобы `src/services/types.ts` и mock-сервисы сразу совпадали с будущим Supabase и потом не пришлось переписывать UI.

## Сущности (Postgres / Supabase)

```
profiles         id (= auth.users.id), full_name, preview_used_at, created_at
shoots           id, owner_user_id, owner_team_id?            -- team — задел на post-launch
                 pack_id ('essential'|'professional'|'executive'), status ('draft'|'previewing'|'preview_ready'|
                 'paid'|'generating'|'ready'|'refunded'|'deleted'),
                 outfit, glasses, style_ids text[], target_count, ready_count,
                 first_full_download_at?, ready_at?, expires_at?, created_at
selfies          id, shoot_id, storage_path, check jsonb (faces, blur, brightness, hash), delete_after
previews         id, shoot_id, style_id, storage_path (512px + watermark), created_at
shoot_photos     id, shoot_id, style_id?, parent_photo_id?   -- parent = исходник для правки
                 kind ('generated'|'edit'), storage_path (4K), width, height,
                 likeness_score, quality_flags jsonb, is_favorite, created_at
edit_jobs        id, user_id, shoot_photo_id, tool, option_id?, custom_text?, scene_upload_id?,
                 variants, credits_cost, status ('queued'|'generating'|'completed'|'failed'|'blocked'),
                 idempotency_key unique, provider_request_id, error_code?, created_at
credit_ledger    id, user_id, delta, kind ('pack_included'|'purchase'|'reserve'|'charge'|'release'|'refund'),
                 edit_job_id?, order_id?, shoot_id?, created_at   -- баланс = SUM(delta)
orders           id, user_id, product ('shoot_pack'|'credit_pack'), product_id, shoot_id?,
                 ls_order_id, amount_cents, status ('paid'|'refunded'), created_at
waitlist         id, email, team_size, created_at
```

RLS «только свои строки». Изменения кредитов и статусов оплаты — только через security-definer функции и webhooks.

## Типы для фронтенда (сейчас = mock)

```ts
type PackId = 'essential' | 'professional' | 'executive'
type EditToolId = 'background' | 'outfit' | 'retouch' | 'relight' | 'creative' | 'place' | 'crop'
type ShootStatus = 'draft' | 'previewing' | 'preview_ready' | 'paid' | 'generating' | 'ready' | 'refunded'

interface User { id: string; email: string; fullName: string; provider: 'email'|'google'; emailVerified: boolean; previewUsed: boolean }
interface ShootPack { id: PackId; name: string; priceUsd: number; photos: number; styles: number | 'all'; editCredits: number; priority: boolean; popular?: boolean }
interface CreditPack { id: string; credits: number; priceUsd: number | null }
interface SelfieCheck { faces: number; faceRatio: number; sharpness: number; brightness: number; duplicateOf?: string;
                        verdict: 'ok'|'warn'|'reject'; reasons: string[] }
interface Selfie { id: string; localId: string; previewUrl: string; check: SelfieCheck }
interface Preview { id: string; styleId: string; url: string }   // 512px, watermark
interface Shoot { id: string; pack: PackId; status: ShootStatus; styleIds: string[]; targetCount: number; readyCount: number;
                  createdAt: string; expiresAt?: string; refundable: boolean; editCreditsLeft: number }
interface ShootPhoto { id: string; shootId: string; styleId?: string; parentId?: string; kind: 'generated'|'edit';
                       url: string; thumbUrl: string; width: number; height: number; isFavorite: boolean }
interface EditInput { photoId: string; tool: EditToolId; optionId?: string; customText?: string; sceneUploadId?: string; variants: 1|2|4 }
interface Quote { credits: number; perVariant: number; variants: number }
interface EditJob { id: string; status: 'queued'|'generating'|'completed'|'failed'|'blocked'; results: ShootPhoto[];
                    error?: { code: string; message: string; refunded: boolean } }
interface LedgerEntry { id: string; createdAt: string; label: string; delta: number }
```

## Потоки

**Превью:** селфи загружены → `requestPreview(shootId, styleIds[2])` → сервер проверяет `preview_used_at` и лимиты по IP и устройству → 4 генерации через fal.ai → фильтр сходства → водяной знак → `preview_ready`, письмо.

**Покупка съёмки:** checkout Lemon Squeezy (custom data: user_id, shoot_id, pack_id) → webhook `order_created` → `orders`, shoot `paid`, ledger `pack_included` (+кредиты тарифа) → постановка задач генерации. Генерация пачками: каждый кадр проходит сходство и проверку брака; не прошедшие — перегенерация, пока не наберётся `target_count` (с потолком попыток и алертом при его превышении). `ready_count` растёт → Realtime → UI. По готовности — `ready`, `expires_at = ready_at + 30d`, письмо; селфи помечаются `delete_after = now + 24h`.

**Возврат съёмки:** доступен, пока `first_full_download_at` пуст. Запрос → Lemon Squeezy refund API → webhook `order_refunded` → shoot `refunded`, файлы удаляются, неизрасходованные кредиты тарифа списываются.

**Правка:** `quote` → `create(input, idempotencyKey)` → транзакция: проверка баланса + `reserve` → fal.ai с webhook → success: `charge`, новые `shoot_photos(kind='edit', parent_photo_id)`; failure или блокировка: `release`.

**Очистка (cron раз в час):** селфи с истёкшим `delete_after`; съёмки с истёкшим `expires_at` (файлы и строки); письмо за 2 дня до `expires_at`.

**Сходство:** эмбеддинг лица по каждому селфи → средний вектор → косинусное сходство с кадром. Провайдер эмбеддингов — с **коммерческой** лицензией (выбор в B0). Шаблоны лица живут только во время обработки и не сохраняются (это пойдёт в Privacy).
