const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ===== Middleware =====
app.use(cors());
app.use(express.json());

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
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");

    // Database & Collection
    const jobCollection = client.db("job-portal").collection("jobs");
    const applicationCollection = client
      .db("job-portal")
      .collection("applications");

    // === GET: All Jobs ===
    app.get("/jobs", async (req, res) => {
      try {
        const jobs = await jobCollection.find().toArray();
        res.send(jobs);
      } catch (error) {
        res.status(500).send({ message: "Error fetching jobs", error });
      }
    });

    const { ObjectId } = require("mongodb");

    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID" });
        }
        const job = await jobCollection.findOne({ _id: new ObjectId(id) });
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        res.json(job); // send JSON
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error });
      }
    });


    //job application api
    //get all data, get one data ,get many data
    app.get("/job-application", async (req, res) => {
      const email = req.query.email;
      const query = { applicantEmail: email };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
      
    });

    app.post("/job-application", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    });


    // === POST: Add a Job ===
    app.post("/jobs", async (req, res) => {
      try {
        const newJob = req.body;
        const result = await jobCollection.insertOne(newJob);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding job", error });
      }
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
