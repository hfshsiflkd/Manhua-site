// src/controllers/admin/index.js

module.exports = {
  ...require("./statsController"),
  ...require("./userController"),
  ...require("./vipController"),
  ...require("./manhuaController"),
  ...require("./logController"),
};
