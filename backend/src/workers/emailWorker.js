const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const sendEmail = require("../utils/sendEmail");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker = new Worker(
  "emails",
  async (job) => {
    const { to, subject, html } = job.data;
    console.log("[emailWorker] job received", { id: job.id, to });
    await sendEmail({ to, subject, html });
    console.log("[emailWorker] job done", { id: job.id, to });
    return true;
  },
  {
    connection,
    concurrency: 1,
    lockDuration: 60_000,
  }
);

worker.on("completed", (job) =>
  console.log("[emailWorker] completed", { id: job.id })
);
worker.on("failed", (job, err) =>
  console.error("[emailWorker] failed", {
    id: job?.id,
    to: job?.data?.to,
    message: err?.message,
  })
);
worker.on("stalled", (jobId) =>
  console.error("[emailWorker] stalled", { jobId })
);
worker.on("error", (err) =>
  console.error("[emailWorker] error", err?.message || err)
);

console.log("✅ Email worker started");
