import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

function redactMongoUri(uri: string) {
  // Hide credentials: mongodb(+srv)://user:pass@host -> mongodb(+srv)://***:***@host
  return uri.replace(/\/\/([^@/]+)@/g, "//***:***@");
}

function appendQueryParam(uri: string, key: string, value: string) {
  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function enhanceMongoConnectError(err: unknown, uri: string) {
  const error = err as { message?: string; code?: number; codeName?: string; name?: string };
  const message = String(error?.message ?? "");
  const code = error?.code;
  const codeName = error?.codeName ?? error?.name;

  const redacted = redactMongoUri(uri);

  const isBadAuth =
    message.toLowerCase().includes("authentication failed") ||
    message.toLowerCase().includes("bad auth") ||
    code === 8000 ||
    codeName === "AtlasError";

  if (isBadAuth) {
    return new Error(
      [
        "MongoDB authentication failed while connecting.",
        `Connection string: ${redacted}`,
        "",
        "Common fixes:",
        "- Verify Atlas Database Access username/password match the URI.",
        "- If your password contains special characters (e.g. @ : / ? #), URL-encode it.",
        "- For Atlas, try adding `authSource=admin` to the URI query string (or create the user on the target DB).",
        "",
        "After changing `.env.local`, restart `next dev` so the new env values are loaded.",
      ].join("\n"),
      { cause: err }
    );
  }

  return new Error(
    `MongoDB connection failed. Connection string: ${redacted}`,
    { cause: err }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalWithMongoose = global as any;

if (!globalWithMongoose.mongooseCache) {
  globalWithMongoose.mongooseCache = { conn: null, promise: null };
}

const cached: MongooseCache = globalWithMongoose.mongooseCache;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  let uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }
  if (
    uri.includes("mongodb+srv://user:pass@cluster.mongodb.net") ||
    uri.includes("_mongodb._tcp.cluster.mongodb.net") ||
    uri.includes("@cluster.mongodb.net/")
  ) {
    throw new Error(
      "MONGODB_URI is still a placeholder (cluster.mongodb.net). Replace it with your real MongoDB Atlas connection string (or a local mongodb:// URI)."
    );
  }

  // Optional override for Atlas projects where users authenticate against `admin`.
  const authSource = process.env.MONGODB_AUTH_SOURCE;
  if (authSource && !/([?&])authSource=/.test(uri)) {
    uri = appendQueryParam(uri, "authSource", authSource);
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      try {
        return await mongoose.connect(uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
        });
      } catch (err) {
        cached.promise = null;
        throw enhanceMongoConnectError(err, uri);
      }
    })();
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
