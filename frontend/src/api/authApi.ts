type User = {
  id: number;
  email: string;
  username?: string;
  role: string;
  status: string;
};

type MessageResponse = {
  message?: string;
};

const API_URL = "http://localhost:8000";

export const logoutUser = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/user/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("logout error");
  }
};

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  passwordCheck: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, email, password, passwordCheck }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ?? "registration error";
    throw new Error(message);
  }

  return {
    message:
      (data as { message?: string }).message ?? "User registered successfully.",
  };
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? "Błąd logowania");
  }

  const data = (await response.json().catch(() => ({}))) as MessageResponse;
  return { message: data.message ?? "User logged successfully." };
};

export const updateUser = async (userData: {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ message: string; user: User }> => {
  const response = await fetch(`${API_URL}/user/me/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? "Failed to update user");
  }

  const data = await response.json();
  return data;
};

export const verifyEmail = async (
  token: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/user/verify-email?token=${token}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? "Failed to verify email");
  }

  const data = await response.json();
  return { message: data.message ?? "Email verified successfully." };
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
    return data.user;
  } catch {
    return null;
  }
};
