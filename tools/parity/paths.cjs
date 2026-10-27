// Pasta de dados da paridade: PARITY_DIR ou <repo>/.parity (ignorada pelo git).
"use strict";
const path = require("path");
module.exports = { P: process.env.PARITY_DIR || path.resolve(__dirname, "..", "..", ".parity") };
