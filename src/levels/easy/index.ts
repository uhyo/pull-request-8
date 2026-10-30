import type { ProblemSet } from "..";
import { commonAnomalies } from "./common";
import { csvExportEncoding } from "./csv-export-encoding";
import { dateFnsUpdate } from "./date-fns-update";
import { readmeSetup } from "./readme-setup";
import { settingsRefactor } from "./settings-refactor";
import { usersPagination } from "./users-pagination";

/** かんたん: 短い説明文のプルリクエスト */
export const easy: ProblemSet = {
  baselines: [usersPagination, csvExportEncoding, dateFnsUpdate, settingsRefactor, readmeSetup],
  commonAnomalies,
};
