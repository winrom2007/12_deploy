const factorial = (n) => {
  console.log("Running for", n);
  return n * factorial(n - 1); // Error: forgot stop condition for n === 0
};

console.log(factorial(6));
