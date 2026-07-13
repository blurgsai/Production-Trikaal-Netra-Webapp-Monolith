import axiosInstance from "@/shared/api/client";
import type {
  UserApiResponse,
  UserCreateApiRequest,
  UserUpdateApiRequest,
} from "./types";

export async function fetchUsers(): Promise<UserApiResponse[]> {
  const res = await axiosInstance.get<UserApiResponse[]>("/users/admin/users");
  return res.data;
}

export async function createUser(
  user: UserCreateApiRequest,
): Promise<UserApiResponse> {
  const res = await axiosInstance.post<UserApiResponse>(
    "/users/admin/users",
    user,
  );
  return res.data;
}

export async function updateUser(
  userId: string,
  user: UserUpdateApiRequest,
): Promise<UserApiResponse> {
  const res = await axiosInstance.patch<UserApiResponse>(
    `/users/admin/users/${userId}`,
    user,
  );
  return res.data;
}

export async function deleteUser(userId: string): Promise<void> {
  await axiosInstance.delete(`/users/admin/users/${userId}`);
}
