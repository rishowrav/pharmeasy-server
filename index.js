const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
};

// middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// verify token middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  //   console.log("token in the middleware", token);

  if (!token) {
    return res
      .status(401)
      .send({ message: "unauthorized access token pai nai re vai" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ message: "unauthorized access token valid na re vai" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const uri = `mongodb+srv://${process.env.USER_name}:${process.env.USER_pass}@cluster0.sp25joa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // clearing Token / LogOut token
    app.post("/logout", async (req, res) => {
      const user = req.body;

      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    const medicineCollection = client.db("pharmeasy").collection("medichines");
    const categoryCollection = client.db("pharmeasy").collection("category");

    // get all category data
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();

      res.send(result);
    });

    // get categoryDetails data
    app.get("/categoryDetails/:category", async (req, res) => {
      const category = req.params.category;
      console.log(category);
      const query = { category };

      const result = await medicineCollection.find(query).toArray();

      res.send(result);
    });

    // get all medicine data
    app.get("/medicines", async (req, res) => {
      const result = await medicineCollection.find().toArray();

      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello d World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
