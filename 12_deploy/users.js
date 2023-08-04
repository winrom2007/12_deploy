const express = require('express');
const pick = require('lodash/pick');

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const clientPromise = MongoClient.connect(process.env.DB_URI, {
  useUnifiedTopology: true,
  maxPoolSize: 10,
})

const auth = require('./middlewares/auth').auth;

const router = express.Router();
router.use(express.json());

router.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("users");
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/", auth(), async (req, res) => {
  if (!req.user) return res.sendStatus(401);

  if (req.query.isActive === "true") {
    let data = await req.db.collection('timers').find({
      isActive: true,
      name: req.user.username
    }).toArray();

    data = data.map((el) => {
      el.start = Number(el.start);
      el.progress = Date.now() - el.start;

      return el;
    });
    res.json(data);
  }

  if (req.query.isActive === "false") {
    let data = await req.db.collection('timers').find({
      isActive: false,
      name: req.user.username
    }).toArray();

    data = data.map((el) => {
      el.start = Number(el.start);
      el.end = Number(el.end);
      el.duration = el.end - el.start;

      return el;
    });
    res.json(data);
  }
});

router.post("/", auth(), async (req, res) => {
  if (!req.user) return res.sendStatus(401);

  try {
    const timestamp = new Date();
    const newTimer = {
      name: req.user.username,
      start: timestamp,
      description: req.body.description,
      isActive: true,
      id: new ObjectId().toString(),
    }

    const { insertedId } = await req.db.collection("timers").insertOne(newTimer);

    res.header("Location", `${req.protocol}://${req.hostname}:27017/api/timers/${insertedId}`);
    res.json(newTimer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.post("/:id/stop", auth(), async (req, res) => {
  if (!req.user) return res.sendStatus(404);

  const id = req.params.id;

  try {
    const timer = await req.db.collection("timers").findOne({ id });

    const updateTimer = {
      isActive: false,
      end: new Date(),
      duration: Date.now() - timer.start
    }

    await req.db.collection("timers").updateOne({ id }, { $set: updateTimer });

    const newTimer = await req.db.collection("timers").findOne({ id });

    res.json(newTimer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = router;
