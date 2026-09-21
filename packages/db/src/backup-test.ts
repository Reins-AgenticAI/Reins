import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readDatabaseUrl } from "./index";

const run = promisify(execFile);

function testTarget(): URL {
  const url = new URL(readDatabaseUrl());
  if (url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/reins_test") {
    throw new Error("Refusing database backup or restore outside 127.0.0.1:5432/reins_test");
  }
  return url;
}

const url = testTarget();
const connection = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}${url.pathname}`;
const output = process.argv.find(
  (argument) => ![process.argv[0], process.argv[1], "--", "--restore"].includes(argument),
);
if (!output || output.includes(".."))
  throw new Error("Provide a relative backup filename without '..'");
const bin = (name: string, win: string) =>
  process.env[name] ?? (process.platform === "win32" ? win : name.toLowerCase());
if (process.argv.includes("--restore")) {
  await run(bin("PG_RESTORE", "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe"), [
    "--clean",
    "--if-exists",
    "--dbname",
    connection,
    output,
  ]);
  console.log(`Backup restored from ${output}`);
} else {
  await run(bin("PG_DUMP", "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"), [
    "--format=custom",
    "--file",
    output,
    connection,
  ]);
  console.log(`Backup written to ${output}`);
}
