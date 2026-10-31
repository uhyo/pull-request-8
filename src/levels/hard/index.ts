import type { ProblemSet } from "..";
import { accessTokenRotation } from "./access-token-rotation";
import { billingService } from "./billing-service";
import { commonAnomalies } from "./common";
import { idempotencyKeys } from "./idempotency-keys";
import { invoiceCronJob } from "./invoice-cronjob";
import { openSearchSync } from "./opensearch-sync";
import { orderEventsOutbox } from "./order-events-outbox";
import { permissionCache } from "./permission-cache";
import { presignedUploads } from "./presigned-uploads";
import { realtimeNotifications } from "./realtime-notifications";
import { reportReadReplica } from "./report-read-replica";
import { tenantRls } from "./tenant-rls";

/** むずかしい: 設計まで書いた長い説明文のプルリクエスト */
export const hard: ProblemSet = {
  baselines: [
    idempotencyKeys,
    orderEventsOutbox,
    permissionCache,
    reportReadReplica,
    accessTokenRotation,
    invoiceCronJob,
    tenantRls,
    presignedUploads,
    realtimeNotifications,
    openSearchSync,
    billingService,
  ],
  commonAnomalies,
};
