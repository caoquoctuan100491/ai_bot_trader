const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();
const apiRoute = (app) => {
  router.post("/register", userController.register);
  router.post("/login", userController.login);

  
  return app.use("api/v1/", router);
};

module.exports = apiRoute;
