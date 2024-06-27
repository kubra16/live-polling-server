# Backend Application

This repository contains the backend application for live polling system.

## Technologies Used

- Node.js
- Express.js
- MongoDB (with Mongoose)
- Socket.IO
- CORS

## Prerequisites

Before running this application, ensure you have the following installed:

- Node.js (v12 or higher)
- MongoDB (running locally or accessible MongoDB URI)
- npm or yarn (package managers)

## Getting Started

Follow these steps to run the backend application locally:

1. **Clone the repository**:

   ```bash
   git clone <repository_url>
   cd server
   ```

2. **install dependencies**:

```bash
   npm install
```

3. **Setup environment variables** :

   - Create a .env file in the root directory based on .env.example. Update it with your MongoDB connection URI and any other necessary variables.

```bash
    MONGO_URL:<your_mobo_url>
```

4. **Start the server** :

```
    npm start
```

- server will run on http:localhost:5000
