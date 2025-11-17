import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="text-white">
      <h1>Landing page</h1>
      <div className="flex flex-col gap-4">
        <button onClick={() => navigate("/login")}>zaloguj sie</button>
        <button onClick={() => navigate("/register")}>zarejestruj sie </button>
      </div>
    </div>
  );
};

export default LandingPage;
