import type { ProblemSet } from "..";
import { auditLog } from "./audit-log";
import { commonAnomalies } from "./common";
import { csvImport } from "./csv-import";
import { frontendErrorReporting } from "./frontend-error-reporting";
import { idleLogout } from "./idle-logout";
import { invoiceTaxRounding } from "./invoice-tax-rounding";
import { node24 } from "./node-24";
import { ordersSearchIndex } from "./orders-search-index";
import { passwordResetExpiry } from "./password-reset-expiry";
import { searchDebounce } from "./search-debounce";
import { staleFeatureFlags } from "./stale-feature-flags";
import { viewerRole } from "./viewer-role";
import { webhookRetry } from "./webhook-retry";

/** ふつう: 長めの説明文のプルリクエスト */
export const normal: ProblemSet = {
  baselines: [
    auditLog,
    csvImport,
    idleLogout,
    node24,
    searchDebounce,
    invoiceTaxRounding,
    passwordResetExpiry,
    staleFeatureFlags,
    webhookRetry,
    viewerRole,
    ordersSearchIndex,
    frontendErrorReporting,
  ],
  commonAnomalies,
};
