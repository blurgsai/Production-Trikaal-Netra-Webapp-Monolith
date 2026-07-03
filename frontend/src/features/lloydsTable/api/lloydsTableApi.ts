import axiosInstance from "@/shared/api/client";

import type {
  MetadataApiResponse,
  LloydsTableApiResponse,
  DistinctValuesResponse,
  ExportFieldRequest,
} from "./types";

export const fetchMetadata = async (): Promise<MetadataApiResponse> => {
  const response = await axiosInstance.get("/lloyds/table/metadata");
  return response.data;
};

export const fetchDistinctValues = async (
  field: string,
  search?: string,
): Promise<DistinctValuesResponse> => {
  const response = await axiosInstance.get("/lloyds/table/metadata/values", {
    params: {
      field,
      search,
      limit: 100,
    },
  });

  return response.data;
};

export const fetchTableData = async (
  params: Record<string, unknown>,
): Promise<LloydsTableApiResponse> => {
  const response = await axiosInstance.get("/lloyds/table/", {
    params,
  });

  return response.data;
};

export const exportTableData = async (
  format: "csv" | "xml" | "xls",
  fields: ExportFieldRequest[],
  filters: unknown[],
) => {
  return axiosInstance.post(
    `/lloyds/table/export/${format}`,
    {
      fields,
      filters,
    },
    {
      responseType: "blob",
    },
  );
};
