import "./App.css";
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/pages/Login";
import Profile from "./components/pages/Profile";
import Light from "./components/Light/Light.tsx";
import Stats from "./components/Stats/Stats.tsx";

function App() {
	return (
		<Routes>
			<Route path="/" element={<Login />} />
			<Route path="/Profile" element={<Profile />} />
		</Routes>
		// <div className="App">
		// 	<>
		// 		<Light />
		// 		<Stats />
		// 	</>
		// </div>
	);
}

export default App;
