const { ObjectId } = require("mongodb");
const { nanoid } = require("nanoid");

const findUserByUsername = (db, username) =>
  db.collection("users").findOne({ username });

const findUserBySessionId = async (db, sessionId) => {
  const session = await db.collection("sessions")
    .findOne(
      { sessionId },
      {
        projection: { userId: 1 },
      }
    );

  if (!session) {
    return;
  }

  return db.collection("users").findOne({ _id: new ObjectId(session.userId) });
};

const createSession = async (db, userId) => {
  const sessionId = nanoid();

  await db.collection("sessions").insertOne({
    userId,
    sessionId,
  });

  return sessionId;
};

const deleteSession = async (db, sessionId) => {
  await db.collection("sessions").deleteOne({ sessionId });
};

module.exports.findUserBySessionId = findUserBySessionId;
module.exports.findUserByUsername = findUserByUsername;
module.exports.createSession = createSession;
module.exports.deleteSession = deleteSession;
