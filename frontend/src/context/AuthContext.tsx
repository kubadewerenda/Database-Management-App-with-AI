import { createContext, useContext, useEffect, useState } from "react";
import {
  registerUser,
  getCurrentUser,
  loginUser,
  logoutUser,
} from "../api/authApi";

type User = {
  id: number;
  email: string;
  username?: string;
  role: string;
  status: string;
};

type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (
    username: string,
    email: string,
    password: string,
    passwordCheck: string
  ) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  //STANY ===========================================================
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const chectAuth = async () => {
      setIsLoading(true);

      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    chectAuth();
  }, []);

  //FUNCKJE ========================================================

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { message } = await loginUser(email, password);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (!currentUser) {
        throw new Error("Nie udało się pobrać danych użytkownika.");
      }
      return message;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    passwordCheck: string
  ) => {
    setIsLoading(true);
    try {
      const { message } = await registerUser(
        username,
        email,
        password,
        passwordCheck
      );
      setUser(null);
      return message;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("registration error");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error("logout error", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, isLoading, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used in AuthProvider");
  }
  return context;
}
