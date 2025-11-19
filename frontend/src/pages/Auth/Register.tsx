import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, passwordCheck);
      //   console.log("register succesfull");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
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
          <div className="text-sm flex items-center gap-1">
            <p className="text-neutral-300">Masz już konto?</p>
            <Link
              to="/login"
              className="text-orange-300 hover:cursor-pointer hover:text-orange-500"
            >
              Zaloguj się
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Register;
