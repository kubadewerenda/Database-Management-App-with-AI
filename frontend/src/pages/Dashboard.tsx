import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <p>{user?.email}</p>
      <p>{user?.role}</p>
    </div>
  );
};

export default Dashboard;
