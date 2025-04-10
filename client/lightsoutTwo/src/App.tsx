import "./App.css";
import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./components/pages/Login";
import Profile from "./components/pages/Profile";
// import Light from "./components/Light/Light.tsx";
// import Stats from "./components/Stats/Stats.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default App;
