const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ===== Middleware =====
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-portal-d2ee0.web.app",
      "https://job-portal-d2ee0.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

const verifyToken = (req, res, next) => {
  // console.log('inside verify middleware' , req.cookies);
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }
  jwt.verify(token, process.env.jwt_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden: Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

// ===== MongoDB Connection URI =====
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.onnfpvx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// ===== Mongo Client Setup =====
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ===== Main Function =====
async function run() {
  try {
    // Connect to MongoDB
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log("✅ Connected to MongoDB");

    // Database & Collection
    const jobCollection = client.db("job-portal").collection("jobs");
    const applicationCollection = client
      .db("job-portal")
      .collection("applications");

    //auth related api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.jwt_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true, token });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    // === GET: All Jobs related api ===
    app.get("/jobs", logger, async (req, res) => {
      const email = req.query.email;
      console.log("now inside callback");
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const jobs = await jobCollection.find(query).toArray();
      console.log("Jobs found:", jobs.length);

      res.send(jobs);
    });
    const { ObjectId } = require("mongodb");

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    //job application api
    //get all data, get one data ,get many data
    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      if (req.user.email !== req.query.email) {
        return res
          .status(403)
          .send({
            message: "Forbidden: You are not allowed to access this resource",
          });
      }
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/job-application/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { _id: jobId };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-application", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);

      for (let application of result) {
        console.log("Application submitted for job ID:", application.job_id);
        const jobId = { _id: new ObjectId(application.job_id) };
        const result2 = await jobCollection.findOne(jobId);
        if (result2) {
          application.title = result2.title;
          application.company = result2.company;
        }
      }
      res.send(result);
    });
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
  }
}

run().catch(console.dir);

// ===== Root Route =====
app.get("/", (req, res) => {
  res.send("Hello World! Server is running 🚀");
});

// ===== Server Listen =====
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
