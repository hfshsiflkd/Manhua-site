require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const manhuaRoutes = require("./routes/manhuaRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const commentRoutes = require("./routes/commentRoutes");
const statsRoutes = require("./routes/statsRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const chapterRoutes = require("./routes/chapterRoutes");

const app = express();

// DB
connectDB();

// middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// routes
app.get("/", (req, res) => {
  res.json({ message: "Manhua API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/manhuas", manhuaRoutes);
app.use("/api/me/favorites", favoriteRoutes);
app.use("/api/me/bookmarks", bookmarkRoutes);
app.use("/api", commentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chapters", chapterRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
