const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const sendEmail = require("../utils/sendEmail");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

new Worker(
  "emails",
  async (job) => {
    const { to, subject, html } = job.data;
    await sendEmail({ to, subject, html });
  },
  { connection }
);

console.log("✅ Email worker started");
