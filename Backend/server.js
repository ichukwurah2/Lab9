import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Sequelize, DataTypes } from "sequelize";
import * as jose from "jose";

dotenv.config();

const DB_SCHEMA = process.env.DB_SCHEMA || "app";
const useSsl = process.env.PGSSLMODE === "require";
const ASGARDEO_ORG = process.env.ASGARDEO_ORG;
const JWKS_URI = `https://api.asgardeo.io/t/${ASGARDEO_ORG}/oauth2/jwks`;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Server is running!");
});

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
    define: {
      schema: DB_SCHEMA,
    },
  }
);

const Puppies = sequelize.define(
  "puppies",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    breed: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    schema: DB_SCHEMA,
    tableName: "puppies",
    timestamps: false,
  }
);

// 🔐 AUTH MIDDLEWARE
async function authMiddleware(req, res, next) {
  const authHeader = (req.headers.authorization || "").trim();
  console.log("AUTH HEADER:", authHeader);

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing auth",
      detail: "Send Authorization: Bearer <access_token>",
    });
  }

  const token = authHeader.slice(7).trim();
  console.log("TOKEN RECEIVED:", token);

  const looksLikeJwt = token && token.split(".").length === 3;

  if (!looksLikeJwt) {
    return res.status(401).json({
      error: "Access token is not a JWT",
    });
  }

  try {
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
    const { payload } = await jose.jwtVerify(token, JWKS);
    console.log("JWT PAYLOAD:", payload);

    req.userId = payload.sub;
    return next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({
      error: "Invalid or expired token",
      detail: err.message,
    });
  }
}

// 🔒 Protect all puppy routes
app.use("/api/puppies", authMiddleware);

// GET all (only this user)
app.get("/api/puppies", async (req, res) => {
  try {
    const puppies = await Puppies.findAll({
      where: { user_id: req.userId },
      order: [["id", "ASC"]],
    });
    res.json(puppies);
  } catch (error) {
    console.error("Error fetching puppies:", error);
    res.status(500).json({ error: "Failed to fetch puppies" });
  }
});

// GET one (only if owned)
app.get("/api/puppies/:id", async (req, res) => {
  try {
    const puppy = await Puppies.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!puppy) {
      return res.status(404).json({ error: "Puppy not found" });
    }

    res.json(puppy);
  } catch (error) {
    console.error("Error fetching puppy:", error);
    res.status(500).json({ error: "Failed to fetch puppy" });
  }
});

// POST (force user_id from token)
app.post("/api/puppies", async (req, res) => {
  try {
    const { name, breed, age } = req.body;

    if (!name || !breed || age === undefined) {
      return res.status(400).json({
        error: "Name, breed, and age are required",
      });
    }

    const newPuppy = await Puppies.create({
      name,
      breed,
      age,
      user_id: req.userId,
    });

    res.status(201).json(newPuppy);
  } catch (error) {
    console.error("Error creating puppy:", error);
    res.status(500).json({ error: "Failed to create puppy" });
  }
});

// PUT (only if owned)
app.put("/api/puppies/:id", async (req, res) => {
  try {
    const puppy = await Puppies.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!puppy) {
      return res.status(404).json({ error: "Puppy not found" });
    }

    const { name, breed, age } = req.body;

    await puppy.update({
      name: name ?? puppy.name,
      breed: breed ?? puppy.breed,
      age: age ?? puppy.age,
    });

    res.json(puppy);
  } catch (error) {
    console.error("Error updating puppy:", error);
    res.status(500).json({ error: "Failed to update puppy" });
  }
});

// DELETE (only if owned)
app.delete("/api/puppies/:id", async (req, res) => {
  try {
    const puppy = await Puppies.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });

    if (!puppy) {
      return res.status(404).json({ error: "Puppy not found" });
    }

    await puppy.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting puppy:", error);
    res.status(500).json({ error: "Failed to delete puppy" });
  }
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    await Puppies.sync({ alter: true });
    console.log(`Puppies model synced in schema "${DB_SCHEMA}".`);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

startServer();