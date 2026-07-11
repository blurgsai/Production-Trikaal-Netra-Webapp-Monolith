import { axiosInstance } from "@/shared/api";

import type { WorldMonitorMetadataApiResponse } from "./types";

export async function getWorldMonitorMetadata(): Promise<WorldMonitorMetadataApiResponse> {
  const res =
    await axiosInstance.get<WorldMonitorMetadataApiResponse>(
      "/world-monitor/filters/metadata",
    );
  return res.data;
}
