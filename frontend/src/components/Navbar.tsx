import { useAuth } from "../context/AuthContext";
import { IoLogOut } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";

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
      <div className="flex items-center justify-between gap-6 rounded-2xl border border-neutral-600/80 bg-neutral-800/60 px-8 py-1">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <FaUser size={17} className="text-neutral-500" />
            <p className="text-neutral-300 font-semibold">{user?.username}</p>
          </div>
          <div className="w-[0.5px] h-7 bg-neutral-600"></div>
          <p className="text-sm font-thin text-neutral-400">{user?.email}</p>
        </div>

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
