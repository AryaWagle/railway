import { z } from "zod";

const envSchema = z.object({
  RISK_API_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
  OSH_API_TOKEN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
  OSH_BASE_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
  /** Page size for OSH /facilities/ when aggregating live data (1–500). */
  OSH_PAGE_SIZE: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(500).optional(),
  ),
  /** Max pages to follow via `next` when building overview (trial-friendly cap). */
  OSH_MAX_PAGES: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(200).optional(),
  ),
  /** Hard cap on features after aggregation (memory / build time). */
  OSH_FEATURE_CAP: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(50).max(50_000).optional(),
  ),
  SYNC_CRON_SECRET: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse({
    RISK_API_URL: process.env.RISK_API_URL,
    OSH_API_TOKEN: process.env.OSH_API_TOKEN,
    OSH_BASE_URL: process.env.OSH_BASE_URL,
    OSH_PAGE_SIZE: process.env.OSH_PAGE_SIZE,
    OSH_MAX_PAGES: process.env.OSH_MAX_PAGES,
    OSH_FEATURE_CAP: process.env.OSH_FEATURE_CAP,
    SYNC_CRON_SECRET: process.env.SYNC_CRON_SECRET,
  });
}

export const DEFAULT_OSH_BASE = "https://opensupplyhub.org/api";
