require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cookie = require("cookie");
const cookieParser = require("cookie-parser");
const nunjucks = require("nunjucks");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const http = require("http");
const { URL } = require("url");
const path = require('path');

const WebSocket = require("ws");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));
app.use('/api/timers', require("./users"));

const server = http.createServer(app);

const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
const clients = new Map();

const findUserByUsername = require('./services').findUserByUsername;
const createSession = require('./services').createSession;
const deleteSession = require('./services').deleteSession;

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

const { MongoClient } = require('mongodb');
const { head } = require('./users');
const { findUserBySessionId } = require('./services');

const clientPromise = MongoClient.connect(process.env.DB_URI, {
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});

const initConnectWithDB = async () => {
  const client = await clientPromise;
  db = client.db("users");
  return db;
};

app.set("view engine", "njk");

const auth = require('./middlewares/auth').auth;

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  if (!req.body) return res.sendStatus(400).send({ error: "Data not formatted properly" });

  const hash = await bcrypt.hash(req.body.password, saltRounds);
  const user = {
    username: req.body.username,
    password: hash,
  };

  await req.db.collection("users").insertOne(user);

  res.redirect("/");
});

app.post("/login", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;

  const user = await findUserByUsername(req.db, username);

  if (!user) {
    return res.status(401).send("Unknown username");
  }

  const result = await bcrypt.compare(password, user.password);

  if (result !== true) {
    return res.status(401).send("Unknown password");
  }

  const sessionId = await createSession(req.db, user._id);

  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect("/");
});

server.on("upgrade", (req, socket, head) => {
  const cookies = cookie.parse(req.headers["cookie"]);
  const sessionId = cookies && cookies["sessionId"];
  const userId = sessionId;

  if (!userId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  req.userId = userId;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  })
})

wss.on("connection", async (ws, req) => {
  const { userId } = req;
  const db = await initConnectWithDB();
  const user = await findUserBySessionId(db, userId);
  const username = user.username;

  clients.set(userId, ws);

  let timersAll = [];
  let oldTimers = [];
  let timersActive = [];
  const timer = () => {
    setInterval(() => {
      const updatedTimers = timersActive.map((t) => {
        t.progress = Date.now() - t.start;
        return t;
      });
      ws.send(JSON.stringify({ type: "timers", updatedTimers }));
    }, 1000);
  };

  ws.on("message", async (message) => {
    console.log(`server received: ${message}`);

    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return;
    }

    if (data.type === "login") {
      ws.send(JSON.stringify({ type: "success_req", userId, message: "Success auth!!!" }));
      timersAll = await db.collection('timers').find({ name: username }).toArray();

      timersActive = timersAll.filter((t) => t.isActive);
      oldTimers = timersAll.filter((t) => !t.isActive);

      //ws.send(JSON.stringify({ type: "active_timers", timersActive }));
      ws.send(JSON.stringify({ type: "all_timers", timersAll }));
      ws.send(JSON.stringify({ type: "old_timers", oldTimers }));

      timer();
    }

    if (data.type === "start") {
      timersAll = await db.collection('timers').find({ name: username }).toArray();

      timersActive = timersAll.filter((t) => t.isActive);
      oldTimers = timersAll.filter((t) => !t.isActive);

      ws.send(JSON.stringify({ type: "all_timers", timersAll }));
      //ws.send(JSON.stringify({ type: "active_timers", timersActive }));
      ws.send(JSON.stringify({ type: "old_timers", oldTimers }));
      ws.send(JSON.stringify({ type: "success_req", message: `You success init new timer ${data.name}`, userId }));
    }

    if (data.type === "stop") {
      timersAll = await db.collection('timers').find({ name: username }).toArray();

      timersActive = timersAll.filter((t) => t.isActive);
      oldTimers = timersAll.filter((t) => !t.isActive);

      ws.send(JSON.stringify({ type: "all_timers", timersAll }));
      //ws.send(JSON.stringify({ type: "active_timers", timersActive }));
      ws.send(JSON.stringify({ type: "old_timers", oldTimers }));
      ws.send(JSON.stringify({ type: "success_req", message: `You succes stopped tomer with id ${data.id}`, userId })
      );
    }
  })

  ws.on("close", async () => {
    clients.delete(userId);
  })
})

app.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }

  await deleteSession(req.db, req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true",
  });
});

app.use((err, req, res, next) => {
  res.status(500).send(err.message);
})

const port = process.env.PORT || 27017;

server.listen(process.env.PORT, () => {
  console.log(`  Server running on http://localhost:${port}`);
})

//app.listen(port, () => {
//  console.log(`  Listening on http://localhost:${port}`);
//});
