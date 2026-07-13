export interface UserApiResponse {
  id: string;
  username: string;
  role: string;
}

export interface UserCreateApiRequest {
  username: string;
  password: string;
  role: string;
}

export interface UserUpdateApiRequest {
  username?: string;
  password?: string;
  role?: string;
}
