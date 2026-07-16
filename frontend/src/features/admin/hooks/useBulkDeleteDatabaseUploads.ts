import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteDatabaseUploads } from "../api/databaseUploadsApi";
import { DATABASE_UPLOADS_QUERY_KEY } from "./useDatabaseUploads";
import { DATABASE_NAMES_QUERY_KEY } from "./useDatabaseNames";

export function useBulkDeleteDatabaseUploads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return await bulkDeleteDatabaseUploads(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATABASE_UPLOADS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DATABASE_NAMES_QUERY_KEY });
    },
  });
}
