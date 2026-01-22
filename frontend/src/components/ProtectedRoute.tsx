import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white text-xl">Ładowanie ...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
