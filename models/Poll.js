// models/Poll.js

const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  question: String,
  options: [String],
  results: Object, // Store results as an object { option: count }
});

const Poll = mongoose.model("Poll", pollSchema);

module.exports = Poll;
