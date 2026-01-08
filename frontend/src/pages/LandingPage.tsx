import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
      <h1 className="text-4xl font-bold text-neutral-200">
        Database Management with AI
      </h1>

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/login")}
          className="bg-neutral-800 text-neutral-200 px-8 py-3 rounded-2xl border border-neutral-700 hover:bg-neutral-700 transition font-semibold"
        >
          Zaloguj
        </button>
        <button
          onClick={() => navigate("/register")}
          className="bg-orange-600 text-white px-8 py-3 rounded-2xl hover:bg-orange-500 transition font-semibold"
        >
          Rejestracja
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
