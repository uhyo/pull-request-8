import type { ProblemSet } from "..";
import { ciCache } from "./ci-cache";
import { commonAnomalies } from "./common";
import { csvExportEncoding } from "./csv-export-encoding";
import { darkMode } from "./dark-mode";
import { dateFnsUpdate } from "./date-fns-update";
import { flakyDateTest } from "./flaky-date-test";
import { imageAlt } from "./image-alt";
import { loginRateLimit } from "./login-rate-limit";
import { ordersNPlusOne } from "./orders-n-plus-one";
import { readmeSetup } from "./readme-setup";
import { settingsRefactor } from "./settings-refactor";
import { termsTypo } from "./terms-typo";
import { usersPagination } from "./users-pagination";

/** かんたん: 短い説明文のプルリクエスト */
export const easy: ProblemSet = {
  baselines: [
    usersPagination,
    csvExportEncoding,
    dateFnsUpdate,
    settingsRefactor,
    readmeSetup,
    loginRateLimit,
    darkMode,
    flakyDateTest,
    ciCache,
    ordersNPlusOne,
    imageAlt,
    termsTypo,
  ],
  commonAnomalies,
};
