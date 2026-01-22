import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sendConnectionString } from "../../api/projectDetailsApi";
import { useNavigate } from "react-router-dom";
import { FaBackward } from "react-icons/fa6";
import { fetchProject } from "../../api/projectDetailsApi";
import { PuffLoader } from "react-spinners";
import { SiPostgresql } from "react-icons/si";
import { SiMysql } from "react-icons/si";
import { SiMariadb } from "react-icons/si";

const DbConnection = ({
  setIsConnected,
}: {
  setIsConnected: (value: boolean) => void;
}) => {
  const [connectionString, setConnectionString] = useState("");
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dbType, setDbType] = useState("");

  const { projectId } = useParams();
  const id = Number(projectId);

  const navigate = useNavigate();

  useEffect(() => {
    const getData = async () => {
      const response = await fetchProject(id);
      setProjectName(response.project.name);
    };
    getData();
  }, [id]);

  const handleSendConnectionString = async () => {
    if (connectionString.trim().length <= 0) {
      setMessage("Podaj connection string");
      return;
    }
    setIsLoading(true);
    try {
      const response = await sendConnectionString(id, connectionString, dbType);

      if (response.message === "Invalid connection string.") {
        setMessage("Błedny connection string");
      }
      if (response.message === "Database connected successfully.") {
        setMessage("Połączono");
        setIsConnected(true);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col  justify-center">
      <div className="flex items-center justify-between px-12 py-4 border-b border-neutral-600">
        <h2 className="text-2xl text-neutral-300">{projectName}</h2>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-2xl border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-orange-500 hover:text-orange-400 hover:cursor-pointer flex items-center gap-2"
        >
          <FaBackward />
          Wróć do listy
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-6 self-start">
          <p className="text-2xl text-neutral-300">Baza danych</p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setDbType("postgres")}
              className={`border p-4 rounded-xl border-neutral-500 hover:bg-neutral-600 hover:cursor-pointer transition ${
                dbType === "postgres" ? "bg-neutral-600" : ""
              }`}
            >
              <SiPostgresql size={40} />
            </button>
            <button
              onClick={() => setDbType("mysql")}
              className={`border p-4 rounded-xl border-neutral-500 hover:bg-neutral-600 hover:cursor-pointer transition ${
                dbType === "mysql" ? "bg-neutral-600" : ""
              }`}
            >
              <SiMysql size={40} />
            </button>
            <button
              onClick={() => setDbType("mysql")}
              className={`border p-4 rounded-xl border-neutral-500 hover:bg-neutral-600 hover:cursor-pointer transition ${
                dbType === "mysql" ? "bg-neutral-600" : ""
              }`}
            >
              <SiMariadb size={40} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <label
            htmlFor="connection-string"
            className="text-xl text-neutral-300"
          >
            Connection string
          </label>
          <input
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            id="connection-string"
            type="text"
            placeholder="postgresql://user:password@localhost:5432/mydb"
            className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/40 transition text-sm h-13"
          />
        </div>
        <div className="flex flex-col w-full justify-between gap-4 relative">
          <button
            onClick={handleSendConnectionString}
            className="p-2 bg-orange-400/80 border border-orange-800/50 rounded-lg font-semibold self-end hover:cursor-pointer hover:bg-orange-600/80 transition flex items-center gap-2"
          >
            <p>Wyślij</p>
            {isLoading && (
              <PuffLoader color="#ffffff" speedMultiplier={1} size={25} />
            )}
          </button>
          {message && (
            <p
              className={`p-2 border rounded-xl font-semibold ${
                message === "Podaj connection string" &&
                "bg-sky-300/20 border-sky-500 text-sky-100"
              } ${
                message == "Błedny connection string" &&
                "bg-red-300/20 border-red-400 text-red-100"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DbConnection;
