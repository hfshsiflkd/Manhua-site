const test = require("node:test");
const assert = require("node:assert/strict");
const { errorHandler } = require("./errorHandler");

function mockRes() {
  return {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function withNodeEnv(value, fn) {
  const prev = process.env.NODE_ENV;
  const had = Object.prototype.hasOwnProperty.call(process.env, "NODE_ENV");
  const log = console.error;
  console.error = () => {};
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    console.error = log;
    if (had) process.env.NODE_ENV = prev;
    else delete process.env.NODE_ENV;
  }
}

test("development error JSON includes stack", () => {
  withNodeEnv("development", () => {
    const err = new Error("Not allowed by CORS");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Not allowed by CORS");
    assert.match(String(res.body.stack || ""), /Not allowed by CORS/);
  });
});

test("production error JSON omits stack", () => {
  withNodeEnv("production", () => {
    const err = new Error("Not allowed by CORS");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Not allowed by CORS");
    assert.equal("stack" in res.body, false);
  });
});

test("unset NODE_ENV does not leak stack", () => {
  withNodeEnv(undefined, () => {
    const err = new Error("Not allowed by CORS");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal("stack" in res.body, false);
  });
});
