const fs = require("fs");
const { Transform } = require("stream");

const capitalize = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toUpperCase()); // chunk is a Buffer, need to convert to string
  },
});

const doubleNewlines = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.replace(/\n/g, "\n\n")); // chunk is a Buffer, need to convert to string
  },
});

const logAndReturn = (prefix) =>
  new Transform({
    transform(chunk, encoding, callback) {
      console.log(prefix, chunk);
      callback(null, chunk);
    },
  });

const fileStream = fs.createReadStream(__filename, "utf8");

fileStream
  .pipe(logAndReturn("initial"))
  .pipe(capitalize)
  .pipe(logAndReturn("after capitalize"))
  .pipe(doubleNewlines)
  .pipe(process.stdout);
