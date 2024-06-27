const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

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

  socket.on("askQuestion", (questionData) => {
    if (!currentQuestion) {
      currentQuestion = questionData;
      results = {};
      console.log(currentQuestion);
      const option = currentQuestion.options;
      studentsAnswer.clear();
      io.emit("newQuestion", questionData);
      setTimeout(() => {
        currentQuestion = null;
        io.emit("updateResults", calculateResults(option));
      }, questionData.duration || 60000);
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
  const total = Object.values(results).reduce((sum, count) => sum + count, 0);
  const percentages = {};
  options.forEach((option) => {
    percentages[option] = total ? ((results[option] || 0) / total) * 100 : 0;
  });
  console.log(percentages);
  console.log(total);
  return percentages;
};

app.get("/", (req, res) => {
  res.send("Server is running");
});

server.listen(5000, () => {
  console.log("listening on port 5000");
});
