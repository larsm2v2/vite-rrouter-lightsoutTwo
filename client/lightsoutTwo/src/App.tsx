import "./App.css";
import { Route, Routes } from "react-router-dom";
import Login from "./components/pages/Login";
import Profile from "./components/pages/Profile";
import Game from "./components/pages/Game";
import CreatePuzzle from "./components/pages/CreatePuzzle";
import SavedMaps from "./components/pages/SavedMaps";
import ProtectedRoute from "./components/auth/ProtectedRoute";
// import Light from "./components/Light/Light.tsx";
// import Stats from "./components/Stats/Stats.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/game" 
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/game/custom/:level"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/game/:level" 
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-puzzle" 
        element={
          <ProtectedRoute>
            <CreatePuzzle />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/saved-maps" 
        element={
          <ProtectedRoute>
            <SavedMaps />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
