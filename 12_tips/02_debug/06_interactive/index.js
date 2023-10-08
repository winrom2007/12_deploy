const express = require("express");

const app = express();

const COLORS = ["red", "blue", "green"];

const getRandomColor = () => {
  const i = Math.floor(Math.random()) * COLORS.length; // Error: multiplication must be before applying Math.floor
  return COLORS[i];
};

app.get("/", (req, res) => {
  res.send(`My favorite color is ${getRandomColor()}.`);
});

const port = 3000;
app.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
