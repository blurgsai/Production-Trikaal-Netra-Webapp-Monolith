import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../api/usersApi";
import { mapUsersFromApi, mapUserFromApi } from "../model/mappers";
import type { User, UserCreateRequest, UserUpdateRequest } from "../model/types";

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

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
