import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRegisteredEmail(null);
    try {
      const message = await register(username, email, password, passwordCheck);
      setSuccessMessage(message);
      setRegisteredEmail(email);
      setUsername("");
      setEmail("");
      setPassword("");
      setPasswordCheck("");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Nie udało się zarejestrować."
      );
    }
  };

  const handleOpenMailbox = () => {
    if (!registeredEmail) return;
    const [, domainRaw] = registeredEmail.split("@");
    const domain = domainRaw?.toLowerCase() ?? "";

    const urlMap: Record<string, string> = {
      "gmail.com": "https://mail.google.com",
      "outlook.com": "https://outlook.live.com/mail",
      "hotmail.com": "https://outlook.live.com/mail",
      "live.com": "https://outlook.live.com/mail",
      "o2.pl": "https://poczta.o2.pl",
      "wp.pl": "https://poczta.wp.pl",
      "interia.pl": "https://poczta.interia.pl",
      "onet.pl": "https://poczta.onet.pl",
      "icloud.com": "https://www.icloud.com/mail",
    };

    const target = urlMap[domain] || (domain ? `https://${domain}` : undefined);

    if (target) {
      window.open(target, "_blank", "noopener");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-neutral-800 py-12 px-8 rounded-3xl border border-neutral-500/70 w-full max-w-md">
        <h1 className="text-neutral-300 text-2xl font-bold mb-12">
          Rejestracja
        </h1>
        <form
          onSubmit={handleSubmit}
          className="text-neutral-400 flex flex-col gap-8"
        >
          <div className="flex flex-col gap-2 ">
            <label htmlFor="username" className="text-md font-semibold">
              Nazwa użytkownika:
            </label>
            <input
              value={username}
              type="text"
              id="username"
              className="outline-none bg-neutral-600/50 text-white font-semibold text-md rounded-3xl border border-neutral-400 h-10 px-4 caret-orange-500 focus:bg-neutral-500/50"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 ">
            <label htmlFor="email" className="text-md font-semibold">
              Email:
            </label>
            <input
              value={email}
              type="text"
              id="email"
              className="outline-none bg-neutral-600/50 text-white font-semibold text-md rounded-3xl border border-neutral-400 h-10 px-4 caret-orange-500 focus:bg-neutral-500/50"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-md font-semibold">
              Hasło:
            </label>
            <input
              value={password}
              type="password"
              id="password"
              className="outline-none bg-neutral-600/50 text-white font-semibold text-sm rounded-3xl border border-neutral-400 h-10 px-4 caret-orange-500 focus:bg-neutral-500/50"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="passwordCheck" className="text-md font-semibold">
              Powtórz hasło:
            </label>
            <input
              value={passwordCheck}
              type="password"
              id="passwordCheck"
              className="outline-none bg-neutral-600/50 text-white font-semibold text-sm rounded-3xl border border-neutral-400 h-10 px-4 caret-orange-500 focus:bg-neutral-500/50"
              onChange={(e) => setPasswordCheck(e.target.value)}
            />
          </div>
          <div>
            <button className="bg-linear-to-l from-orange-400 to-orange-500 border border-orange-700/40 text-white font-semibold rounded-3xl py-2 hover:brightness-110  hover:scale-[1.02] transition hover:cursor-pointer px-12 text-sm">
              Zarejestruj
            </button>
          </div>
          {errorMessage && (
            <p className="text-sm text-rose-400 font-semibold">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-emerald-400 font-semibold">
                {successMessage} Sprawdź skrzynkę e-mail i potwierdź konto.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpenMailbox}
                  className="rounded-3xl border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                  disabled={!registeredEmail}
                >
                  Otwórz skrzynkę pocztową
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="rounded-3xl border border-orange-400/60 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
                >
                  Przejdź do logowania
                </button>
              </div>
            </div>
          )}
          <div className="text-sm flex items-center gap-1">
            <p className="text-neutral-300">Masz już konto?</p>
            <Link
              to="/login"
              className="text-orange-300 hover:cursor-pointer hover:text-orange-500"
            >
              Zaloguj się
            </Link>
          </div>
          <a
            href="http://13.37.105.59/user/login/google"
            className="flex items-center justify-center w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded-3xl text-white text-sm font-semibold transition mt-2"
          >
            Google
          </a>
        </form>
      </div>
    </main>
  );
};

export default Register;
