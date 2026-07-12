export interface User {
  id: string;
  username: string;
  role: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
}

export interface UserUpdateRequest {
  username?: string;
  password?: string;
  role?: string;
}

export interface BaseMap {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  created_at?: string;
}

export interface Overlay {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  color: string;
  opacity: number;
  created_at?: string;
}
