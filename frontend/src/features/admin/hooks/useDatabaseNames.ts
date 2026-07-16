import { useQuery } from "@tanstack/react-query";
import { fetchDatabaseNames } from "../api/databaseUploadsApi";

export const DATABASE_NAMES_QUERY_KEY = ["admin", "data-management", "database-names"];

export function useDatabaseNames() {
  return useQuery<string[]>({
    queryKey: DATABASE_NAMES_QUERY_KEY,
    queryFn: fetchDatabaseNames,
  });
}
