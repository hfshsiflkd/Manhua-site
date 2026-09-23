require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
if (process.env.DB_DRIVER === "postgres") {
  console.error("refusing Mongo appsetting dump while DB_DRIVER=postgres");
  process.exit(1);
}
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 1, serverSelectionTimeoutMS: 10000 });
  const rows = await mongoose.connection.db
    .collection("appsettings")
    .find({}, { projection: { key: 1, value: 1 } })
    .toArray();
  for (const r of rows) {
    const v = r.value;
    let t = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    if (v && typeof v === "object" && !Array.isArray(v)) t = "object:" + Object.keys(v).sort().join(",");
    console.log(String(r.key), t);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.name, e.message);
  process.exit(1);
});
