import { useAuth } from "../context/AuthContext";
import { IoLogOut } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  return (
    <nav>
      <div className="flex items-center justify-between gap-6 rounded-4xl border border-neutral-600 bg-neutral-800/80 px-8 py-3">
        <p className="text-sm font-semibold text-neutral-300">{user?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-neutral-300 transition hover:border-orange-500/50 hover:text-orange-400"
        >
          <IoLogOut size={22} />
          <span className="text-sm font-semibold">Wyloguj</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
