export interface LoginApiRequest {
  username: string;
  password: string;
}

export interface LoginApiResponse {
  token: string;
  role: string;
  user_id: string;
  username: string;
}
