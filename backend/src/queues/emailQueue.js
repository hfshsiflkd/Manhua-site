const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ шаарддаг
});

const emailQueue = new Queue("emails", { connection });

// ✅ controller-ууд эндээс import хийнэ
async function enqueueEmail(payload) {
  // payload: { to, subject, html }
  return emailQueue.add("send", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

module.exports = { emailQueue, enqueueEmail, connection };
