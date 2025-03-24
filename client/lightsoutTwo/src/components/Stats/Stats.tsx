import React from "react";

interface UserStats {
  user: [
    { name: string },
    { currentLevel: number },
    { currentBestNumberOfMoves: { [level: string]: number[] } }
  ];
}

const Stats: React.FC = () => {
  const createUser = async (name: string) => {
    try {
      const response = await fetch("http://localhost:3001/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        console.log("User created successfully");
      } else {
        console.error("Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const updateUserLevel = async (name: string, level: number) => {
    try {
      const response = await fetch(
        `http://localhost:3001/users/${name}/level`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ level }),
        }
      );
      if (response.ok) {
        console.log("User level updated successfully");
      } else {
        console.error("Failed to update user level");
      }
    } catch (error) {
      console.error("Error updating user level:", error);
    }
  };

  const updateUserBestMoves = async (
    name: string,
    level: number,
    moves: number
  ) => {
    try {
      const response = await fetch(
        `http://localhost:3001/users/${name}/moves`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ level, moves }),
        }
      );
      if (response.ok) {
        console.log("User best moves updated successfully");
      } else {
        console.error("Failed to update user best moves");
      }
    } catch (error) {
      console.error("Error updating user best moves:", error);
    }
  };

  return (
    <div>
      <button onClick={() => createUser("Test User")}>Create User</button>
      <button onClick={() => updateUserLevel("Test User", 2)}>
        Update Level
      </button>
      <button onClick={() => updateUserBestMoves("Test User", 1, 10)}>
        Update Best Moves
      </button>
    </div>
  );
};

export default Stats;
