type User = {
  id: number;
  email: string;
  role: string;
  status: string;
};

type AuthResponse = {
  user: User;
  accessToken: string;
};

const API_URL = "http://localhost:8000";

export const registerUser = async (
  email: string,
  password: string,
  passwordCheck: string
): Promise<User> => {
  const response = await fetch(`${API_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, passwordCheck }),
  });

  console.log("Response status:", response.status);

  if (!response.ok) {
    throw new Error("registration error");
  }

  const data: AuthResponse = await response.json();
  console.log("RESPONSE = ", data);
  return data.user;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const response = await fetch(`${API_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  console.log("Login response status", response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error("Błąd logowania", errorData);
  }

  const data: AuthResponse = await response.json();
  console.log("Login response", data);
  return data.user;
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/user/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    console.log("getCurrentUser respose", data);
    return data.user;
  } catch (error) {
    console.error("getCurrentUser", error);
    return null;
  }
};
