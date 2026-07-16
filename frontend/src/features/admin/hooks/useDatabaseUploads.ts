import { useQuery } from "@tanstack/react-query";
import { fetchDatabaseUploads } from "../api/dataManagementApi";
import { mapDatabaseUploadsFromApi } from "../model/mappers";
import type { PaginatedDatabaseUploads } from "../model/dataManagementTypes";

export const DATABASE_UPLOADS_QUERY_KEY = ["admin", "data-management", "database-uploads"];

export interface DatabaseUploadsParams {
  databaseName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useDatabaseUploads(params: DatabaseUploadsParams = {}) {
  const { databaseName, search, page = 0, pageSize = 25 } = params;

  return useQuery<PaginatedDatabaseUploads>({
    queryKey: [...DATABASE_UPLOADS_QUERY_KEY, databaseName, search, page, pageSize],
    queryFn: async () => {
      const raw = await fetchDatabaseUploads({
        database_name: databaseName || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      return {
        items: mapDatabaseUploadsFromApi(raw.items),
        total: raw.total,
      };
    },
  });
}
