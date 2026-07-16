import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDatabaseUpload } from "../api/dataManagementApi";
import { DATABASE_UPLOADS_QUERY_KEY } from "./useDatabaseUploads";
import { DATABASE_NAMES_QUERY_KEY } from "./useDatabaseNames";

export function useDeleteDatabaseUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteDatabaseUpload(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATABASE_UPLOADS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DATABASE_NAMES_QUERY_KEY });
    },
  });
}
