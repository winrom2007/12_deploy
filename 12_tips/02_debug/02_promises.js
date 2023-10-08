const fetch = require("node-fetch");

const logAndReturn = (prefix) => (arg) => {
  console.log(prefix, arg);
  return arg;
};

fetch("https://swapi.dev/api/people/?search=r2")
  .then(logAndReturn("response"))
  .then((res) => res.json())
  .then(logAndReturn("json"))
  .then((data) => data.results[1]) // Error: must be [0]
  .then(logAndReturn("single entry"))
  .then((data) => data.name)
  .then(console.log);
