import { useState } from "react";
import { useParams } from "react-router-dom";
import { sendConnectionString } from "../../api/projectDetailsApi";

const DbConnection = () => {
  const [connectionString, setConnectionString] = useState("");
  const [message, setMessage] = useState("");

  const { projectId } = useParams();
  const id = Number(projectId);

  const handleSendConnectionString = async () => {
    if (connectionString.trim().length <= 0) {
      setMessage("Podaj connection string");
      return;
    }
    const response = await sendConnectionString(id, connectionString);

    console.log(response);

    if (response.message === "Invalid connection string.") {
      setMessage("Błedny connection string");
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor="connection-string">Connection string</label>
        <input
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          id="connection-string"
          type="text"
          className="bg-white text-black"
        />
        <p>{projectId}</p>
        <button onClick={handleSendConnectionString}>wyslij</button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
};

export default DbConnection;
