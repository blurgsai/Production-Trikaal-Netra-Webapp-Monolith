import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../api/usersApi";
import { mapUserFromApi } from "../model/mappers";
import type { User, UserUpdateRequest } from "../model/types";

const USERS_QUERY_KEY = ["admin", "users"];

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { userId: string; data: UserUpdateRequest }>({
    mutationFn: async ({ userId, data }) => {
      const raw = await updateUser(userId, {
        username: data.username,
        password: data.password,
        role: data.role,
      });
      return mapUserFromApi(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
