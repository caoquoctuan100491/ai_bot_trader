require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const apiRouter = require("./routers/apiv1");
const http = require("http");
const exchangeAIController = require("./controllers/exchangeTrader");
const socket = require("./socket/socket");
const morgan = require("morgan");
const teleController = require("./controllers/telegramController");

const app = express();
app.use(cors());

// Cấu hình server http và socket.io
const server = http.createServer(app);
socket.initializeSocket(server);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

app.use(express.json());
app.use(morgan("dev"));
// apiRouter(app);

// exchangeAIController.resume();

server.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`));
