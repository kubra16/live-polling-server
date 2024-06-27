const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
});
const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
db.once("open", () => {
  console.log("Connected to MongoDB");
});

const Poll = require("./models/Poll");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

let currentQuestion = null;
let results = {};
let studentsAnswer = new Set();
let activeUsers = new Map();

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  socket.on("askQuestion", async (questionData) => {
    if (!currentQuestion) {
      currentQuestion = questionData;
      const option = questionData.options;
      results = {};
      studentsAnswer.clear();

      // Save question to MongoDB
      const newPoll = new Poll({
        question: currentQuestion.text,
        options: currentQuestion.options,
        results: {},
      });

      try {
        await newPoll.save();
        io.emit("newQuestion", questionData); // Broadcast new question to all clients
        setTimeout(() => {
          currentQuestion = null;
          io.emit("updateResults", calculateResults(option));
        }, questionData.duration || 60000);
      } catch (error) {
        console.error("Error saving new poll:", error);
      }
    }
  });

  socket.on("submitAnswer", (data) => {
    if (currentQuestion && !studentsAnswer.has(data.studentId)) {
      results[data.answer] = (results[data.answer] || 0) + 1;
      studentsAnswer.add(data.studentId);
      const options = currentQuestion.options;
      io.emit("updateResults", calculateResults(options));
    }
  });

  socket.on("kickStudent", (studentName) => {
    console.log(`Teacher is kicking student: ${studentName}`);
    console.log(
      "Active users before kicking:",
      Array.from(activeUsers.entries())
    );

    for (let [id, user] of activeUsers) {
      if (user.name === studentName && user.role === "student") {
        activeUsers.delete(id);
        console.log(`Student ${studentName} with id ${id} has been kicked.`);
        console.log(
          "Active users after kicking:",
          Array.from(activeUsers.entries())
        );
        io.to(id).emit("kicked");
        break;
      }
    }

    io.emit("updateOnlineUsers", Array.from(activeUsers.values()));
    console.log("Updated online users list:", Array.from(activeUsers.values()));
  });

  socket.on("registerUser", (userName, role) => {
    const user = { name: userName, role, socketId: socket.id };
    activeUsers.set(socket.id, user);
    io.emit("updateOnlineUsers", Array.from(activeUsers.values()));
    console.log(
      "Registered user:",
      userName,
      "with role:",
      role,
      "and socketId:",
      socket.id
    );
  });

  socket.on("sendMessage", (messageData) => {
    console.log("Received sendMessage event with messageData:", messageData);

    const recipient = Array.from(activeUsers.values()).find(
      (user) => user.name === messageData.recipient
    );

    if (recipient) {
      console.log("Sending message to:", recipient);
      io.to(recipient.socketId).emit("receiveMessage", messageData);
      console.log(
        "Message sent to recipient:",
        messageData.recipient,
        "with socketId:",
        recipient.socketId
      );
    } else {
      console.log(
        `Recipient ${messageData.recipient} not found in activeUsers.`
      );
    }
  });

  socket.on("disconnect", () => {
    const disconnectedUser = Array.from(activeUsers.values()).find(
      (user) => user.socketId === socket.id
    );

    if (disconnectedUser) {
      activeUsers.delete(disconnectedUser.name);
      io.emit("updateOnlineUsers", Array.from(activeUsers.values()));
      console.log("Client disconnected", socket.id);
    }
  });
});

const calculateResults = (options) => {
  const totalAnswers = Object.values(results).reduce(
    (sum, count) => sum + count,
    0
  );
  const percentages = {};
  options.forEach((option) => {
    const count = results[option] || 0;
    percentages[option] = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
  });

  console.log("Results percentages:", percentages);
  return percentages;
};

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/previous-polls", async (req, res) => {
  try {
    const polls = await Poll.find({});
    res.json(polls);
  } catch (error) {
    console.error("Error fetching previous polls:", error);
    res.status(500).json({ error: "Failed to fetch previous polls" });
  }
});

server.listen(5000, () => {
  console.log("listening on port 5000");
});
