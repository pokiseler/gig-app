# Project Guidelines

## Architecture

- This workspace is a small Node.js API using Express and Mongoose with CommonJS modules.
- Keep route files thin. Put request validation, query construction, database access, and response shaping in controllers. Follow the pattern in `controllers/gigController.js`.
- Keep Mongoose schemas, enums, defaults, and indexes in `models/`. Follow the patterns in `models/Gig.js` and `models/User.js`.
- `server.js` is responsible for app bootstrapping and starts the HTTP server only after `connectDB()` succeeds.
- `db.js` owns MongoDB connection setup and loads environment variables with `dotenv`.

## Build And Run

- Install dependencies with `npm install`.
- Start the API in development with `npm run dev`.
- Start the API without nodemon with `npm start`.
- There is currently no automated test script in `package.json`. If you add tests, add an npm script and document the command here.
- Seed data manually with `node seed.js` only when intentional. The seed script clears existing `users` and `gigs` data and drops indexes before recreating sample records.

## Conventions

- Preserve the existing CommonJS style: `require(...)` imports and `module.exports` exports.
- Return JSON errors with appropriate HTTP status codes and a `message` field. Follow the controller patterns already in use.
- Validate request inputs in controllers before hitting the database. This codebase already validates required fields, ObjectId values, and numeric price inputs.
- When adding list endpoints, build filters and sort options through explicit allowlists instead of passing query parameters directly to MongoDB.
- Keep result limits bounded. Existing code caps list queries at 100 records.
- Keep `populate()` field selection narrow so responses do not expose unnecessary user fields.
- Preserve role-driven gig rules unless the feature explicitly changes them: providers create `offering` gigs, consumers create `wanted` gigs.

## Environment Notes

- `MONGODB_URI` must be present in the environment or the app will fail during startup.
- The current routes do not use authentication middleware. Do not assume `req.user` exists unless you introduce and wire auth explicitly.
- `db.js` enables Mongoose debug logging. Expect query logging in local runs unless you change that behavior intentionally.