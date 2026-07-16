import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDatabaseUpload } from "../api/dataManagementApi";
import { DATABASE_UPLOADS_QUERY_KEY } from "./useDatabaseUploads";
import type { DatabaseUploadUpdateRequest } from "../model/dataManagementTypes";

export function useUpdateDatabaseUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DatabaseUploadUpdateRequest }) => {
      const apiData: Record<string, unknown> = {};
      if (data.databaseName !== undefined) apiData.database_name = data.databaseName;
      if (data.mmsi !== undefined) apiData.mmsi = data.mmsi;
      if (data.data !== undefined) apiData.data = data.data;
      return await updateDatabaseUpload(id, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATABASE_UPLOADS_QUERY_KEY });
    },
  });
}
