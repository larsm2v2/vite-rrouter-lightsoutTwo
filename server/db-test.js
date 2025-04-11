const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// 1. Print current directory
console.log("Current directory:", process.cwd());

// 2. Define database path
const dbPath = path.join(process.cwd(), "test-db.sqlite");
console.log("Database path:", dbPath);

// 3. Check if directory is writable
try {
  fs.writeFileSync(path.join(process.cwd(), "test-write.txt"), "test");
  console.log("Directory is writable");
  fs.unlinkSync(path.join(process.cwd(), "test-write.txt"));
} catch (err) {
  console.error("Directory is not writable:", err);
}

// 4. Try creating database
try {
  const db = new Database(dbPath);
  console.log("Database created successfully");

  // 5. Try running a simple query
  db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)");
  console.log("Created test table");

  // 6. Close database
  db.close();
  console.log("Database closed");
} catch (err) {
  console.error("Database error:", err);
}
