import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../api/usersApi";
import { mapUsersFromApi } from "../model/mappers";
import type { User } from "../model/types";

export { useCreateUser } from "./useCreateUser";
export { useUpdateUser } from "./useUpdateUser";
export { useDeleteUser } from "./useDeleteUser";

const USERS_QUERY_KEY = ["admin", "users"];

export function useUsers() {
  return useQuery<User[]>({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const raw = await fetchUsers();
      return mapUsersFromApi(raw);
    },
  });
}
