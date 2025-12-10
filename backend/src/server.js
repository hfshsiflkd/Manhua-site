// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// DB
const connectDB = require("./config/db");

// Error handlers
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const manhuaRoutes = require("./routes/manhuaRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const statsRoutes = require("./routes/statsRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const chapterRoutes = require("./routes/chapterRoutes");
const editorRoutes = require("./routes/editorRoutes");

const app = express();
const PORT = process.env.PORT || 9000;

/* =======================
   Middlewares
======================= */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

/* =======================
   Health check
======================= */
app.get("/", (req, res) => {
  res.json({ message: "Manhua API is running" });
});

/* =======================
   Routes
======================= */
app.use("/api/auth", authRoutes);

app.use("/api/manhuas", manhuaRoutes);
app.use("/api/chapters", chapterRoutes);

app.use("/api/me/favorites", favoriteRoutes);
app.use("/api/me/bookmarks", bookmarkRoutes);

app.use("/api/stats", statsRoutes);

app.use("/api/upload", uploadRoutes);
app.use("/api/editor", editorRoutes);

// ✅ admin route давхар байсныг зассан
app.use("/api/admin", adminRoutes);

/* =======================
   Error handling
======================= */
app.use(notFound);
app.use(errorHandler);

/* =======================
   Start server
======================= */
async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server start failed:", error);
    process.exit(1);
  }
}

startServer();
