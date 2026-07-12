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
  sourceType: string;
  tileUrl: string;
  attribution: string;
  createdAt?: string;
}

export interface Overlay {
  id: string;
  name: string;
  type: string;
  sourceType: string;
  tileUrl: string;
  attribution: string;
  color: string;
  opacity: number;
  createdAt?: string;
}
