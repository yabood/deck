import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const isLocalHost = ["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname);

// Plain TCP Postgres driver: works identically against a local Postgres
// (e.g. running under Colima for dev) and Neon (in the cloud) — no proxy or
// HTTP-only driver needed. Neon requires TLS; local Postgres doesn't have it.
export const sql = postgres(connectionString, {
  ssl: isLocalHost ? false : "require",
});
