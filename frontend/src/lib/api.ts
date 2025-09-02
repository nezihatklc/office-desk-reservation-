// src/lib/api.ts
import axios from "axios";

// Adjust port based on your Rider backend logs
const API = axios.create({
  baseURL: "http://localhost:5138/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// -------------------
// Types
// -------------------
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  // add other fields returned by your backend DTO
}

// -------------------
// API Functions
// -------------------

// Register
export async function registerUser(payload: RegisterPayload): Promise<UserResponse> {
  try {
    const response = await API.post<UserResponse>("/Users/register", payload);
    return response.data;
  } catch (error: any) {
    console.error("Register API error:", error);
    throw error.response?.data || { message: error.message };
  }
}

// Login
export async function loginUser(payload: LoginPayload): Promise<UserResponse> {
  try {
    const response = await API.post<UserResponse>("/Users/login", payload);
    return response.data;
  } catch (error: any) {
    console.error("Login API error:", error);
    throw error.response?.data || { message: error.message };
  }
}
