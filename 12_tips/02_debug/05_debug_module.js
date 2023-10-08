const fs = require("fs");

const debug = require("debug");

const debugFibonacci = debug("fibonacci");
const debugFactorial = debug("factorial");

fs.writeFileSync("./fibonacci.txt", "");

let a = 1;
let b = 1;
setInterval(() => {
  fs.appendFileSync("./fibonacci.txt", `${a}\n`);
  debugFibonacci(a);
  const c = a + b;
  a = b;
  b = c;
}, 500);

fs.writeFileSync("./factorial.txt", "");

let f = 1;
let n = 0;
setInterval(() => {
  fs.appendFileSync("./factorial.txt", `${f}\n`);
  debugFactorial(f);
  n += 1;
  f *= n;
}, 500);
