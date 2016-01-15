//expected error at for keyword
console.log([for (a of [1, 2, ...it(10)]) a * 2])