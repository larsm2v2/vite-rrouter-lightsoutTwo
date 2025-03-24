import React, { useEffect, useState } from "react";
import axios from "axios";

const Profile = () => {
	const [user, setUser] = useState(null);

	useEffect(() => {
		axios
			.get("http://localhost:5000/profile")
			.then((response) => setUser(response.data))
			.catch((error) => console.error(error));
	}, []);

	return (
		<div>
			<h1>Profile</h1>
			{user && <pre>{JSON.stringify(user, null, 2)}</pre>}
		</div>
	);
};

export default Profile;
