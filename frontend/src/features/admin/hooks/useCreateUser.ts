import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api/usersApi";
import { mapUserFromApi } from "../model/mappers";
import type { User, UserCreateRequest } from "../model/types";

const USERS_QUERY_KEY = ["admin", "users"];

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UserCreateRequest>({
    mutationFn: async (req) => {
      const raw = await createUser({
        username: req.username,
        password: req.password,
        role: req.role,
      });
      return mapUserFromApi(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
