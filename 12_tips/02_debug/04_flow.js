const flowRight = require("lodash/flowRight");

const square = (x) => x * x;
const plusOne = (x) => x + 1;

const logAndReturn = (prefix) => (arg) => {
  console.log(prefix, arg);
  return arg;
};

console.log(
  flowRight(
    logAndReturn(5),
    square,
    logAndReturn(4),
    square,
    logAndReturn(3),
    plusOne,
    logAndReturn(2),
    square,
    logAndReturn(1),
    plusOne,
    logAndReturn(0)
  )(10)
);
