import { useState } from "react";
import { updateUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";

const Settings = () => {
  const { user, setUser } = useAuth();

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Updating...");
    setError("");

    try {
      const payload: {
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};
      if (username && username !== user?.username) payload.username = username;
      if (email && email !== user?.email) payload.email = email;
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setStatus("No changes detected.");
        return;
      }

      const response = await updateUser(payload);

      setUser(response.user);
      setStatus("Settings updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
      setStatus("");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-neutral-200 max-w-xl">
      <h2 className="text-2xl font-bold">Ustawienia użytkownika</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-neutral-400">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-neutral-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="h-px bg-neutral-700 my-2"></div>
        <p className="text-sm text-neutral-500">
          Zmień hasło (oba pola wymagane)
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-neutral-400">
            Aktualne hasło
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-neutral-400">
            Nowe hasło
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white outline-none focus:border-blue-500 transition"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {status && <p className="text-green-400 text-sm">{status}</p>}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded mt-4 transition w-fit"
        >
          Zapisz zmiany
        </button>
      </form>
    </div>
  );
};

export default Settings;
