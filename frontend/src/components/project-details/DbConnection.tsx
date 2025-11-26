import { useState } from "react";
import { useParams } from "react-router-dom";
import { sendConnectionString } from "../../api/projectDetailsApi";

// type DbSchema = {
//   name: string;
//   schema: string;
//   columns: {
//     name: string;
//     dataType: string;
//     isNullable: string;
//     defaultValue: boolean;
//     isForeignKey: boolean;
//   }[];
//   commend: string;
// };

const DbConnection = ({
  setIsConnected,
}: {
  setIsConnected: (value: boolean) => void;
}) => {
  const [connectionString, setConnectionString] = useState("");
  const [message, setMessage] = useState("");
  // const [database, setDatabase] = useState<DbSchema[]>([]);

  const { projectId } = useParams();
  const id = Number(projectId);

  // const handleFetchingData = async () => {
  //   const response = await projectOverview(id);
  //   console.log(response.projectOverview.schema.tables);
  //   setDatabase(response.projectOverview.schema.tables);
  // };

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
    if (response.message === "Database connected successfully.") {
      setMessage("Połączono");
      setIsConnected(true);
    }
  };

  return (
    <div className="bg-emerald-500">
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
        {message && <p>{message}</p>}
        {/* <button onClick={handleFetchingData}>pobierz</button> */}
      </div>

      {/* <div className="bg-emerald-700 flex flex-wrap max-w-1/2">
        {database.map((element, index) => (
          <div key={index}>
            <h3>{element.name}</h3>
            {element.columns.map((element, index) => (
              <div key={index} className="flex gap-1 bg-slate-900">
                <p>{element.name}</p>
              </div>
            ))}
          </div>
        ))}
      </div> */}
    </div>
  );
};

export default DbConnection;
