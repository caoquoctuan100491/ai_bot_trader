const express = require("express");
const auth = require("../middleware/auth");
const userController = require("../controllers/userController");
const exchangeAPIController = require("../controllers/exchangeApiController");
const exchangeAIController = require("../controllers/exchangeTrader");

const router = express.Router();
const apiRoute = (app) => {
  router.post("/register", userController.register);
  router.post("/login", userController.login);
  router.post("/verify",auth);

  router.post("/api", auth, exchangeAPIController.addAPI);
  router.get("/get_Api", auth, exchangeAPIController.getListAPI);
  router.patch("/api/:id", auth, exchangeAPIController.updateAPI);
  router.delete("/api/:id", auth, exchangeAPIController.deleteAPI);

  router.get("/fetchBalance", auth, exchangeAIController.fetchBalance);
  router.get("/fetchSymbols", exchangeAIController.fetchSymbols);
  router.post(
    "/toggleListentNewSymbols",
    auth,
    exchangeAIController.toggleListentNewSymbol
  );
  router.get(
    "/statusListentNewSymbols",
    auth,
    exchangeAIController.statusListentNewSymbols
  );

  router.get("/trader/", auth, exchangeAIController.getListAITrader);
  router.post("/trader/", auth, exchangeAIController.start);
  router.patch("/trader/:id", auth, exchangeAIController.update);
  router.delete("/trader/:id", auth, exchangeAIController.stop);

  return app.use("/api/v1", router);
};

module.exports = apiRoute;
