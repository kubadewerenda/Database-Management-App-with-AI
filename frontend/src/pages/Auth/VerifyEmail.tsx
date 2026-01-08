import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyEmail } from "../../api/authApi";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Weryfikacja adresu email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Brak tokenu weryfikacyjnego.");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(token);
        setStatus("success");
        setMessage(response.message || "Email został pomyślnie zweryfikowany!");
        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Błąd weryfikacji. Token może być nieprawidłowy lub wygasły."
        );
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-neutral-200 p-4">
      <div className="flex flex-col gap-4 p-8 rounded-lg bg-neutral-900 border border-neutral-800 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center">
          {status === "loading"
            ? "Weryfikacja..."
            : status === "success"
            ? "✓ Sukces!"
            : "✗ Błąd"}
        </h2>

        <p
          className={`text-sm text-center ${
            status === "success"
              ? "text-green-400"
              : status === "error"
              ? "text-red-400"
              : "text-neutral-400"
          }`}
        >
          {message}
        </p>

        {status === "success" && (
          <p className="text-xs text-neutral-500 text-center">
            Za chwilę nastąpi przekierowanie...
          </p>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => navigate("/register")}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
            >
              Zarejestruj się ponownie
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition"
            >
              Przejdź do logowania
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default VerifyEmail;
