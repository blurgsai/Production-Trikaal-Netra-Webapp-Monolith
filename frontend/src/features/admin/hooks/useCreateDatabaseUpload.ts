import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDatabaseUpload } from "../api/databaseUploadsApi";
import { DATABASE_UPLOADS_QUERY_KEY } from "./useDatabaseUploads";
import { DATABASE_NAMES_QUERY_KEY } from "./useDatabaseNames";
import type { DatabaseUploadCreateRequest } from "../model/databaseUploadTypes";

export function useCreateDatabaseUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DatabaseUploadCreateRequest) => {
      const apiData = {
        database_name: data.databaseName,
        mmsi_field: data.mmsiField,
        file: data.file,
      };
      return await createDatabaseUpload(apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATABASE_UPLOADS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DATABASE_NAMES_QUERY_KEY });
    },
  });
}
