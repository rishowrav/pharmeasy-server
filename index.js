const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const stripe = require("stripe").Stripe(process.env.STRIPE_secret_key);

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pharmeasy-client.web.app",
  ],
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
    const medicineCollection = client.db("pharmeasy").collection("medichines");
    const categoryCollection = client.db("pharmeasy").collection("category");
    const usersCollection = client.db("pharmeasy").collection("users");
    const advertiseCollection = client.db("pharmeasy").collection("advertise");
    const cartCollection = client.db("pharmeasy").collection("cart");
    const paymentCollection = client.db("pharmeasy").collection("payment");

    // Admin Verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const user = await usersCollection.findOne({ email });

      if (!user || user?.role !== "Admin")
        return res.status(401).send({ message: "Unauthorize access" });

      next();
    };

    // Seller Verify
    const verifySeller = async (req, res, next) => {
      const email = req.user.email;
      const user = await usersCollection.findOne({ email });

      if (!user || user?.role !== "Seller")
        return res.status(401).send({ message: "Unauthorize access" });

      next();
    };

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // clearing Token / LogOut token
    app.get("/logout", async (req, res) => {
      const user = req.body;

      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

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

    // get all medicine data with email
    app.get("/medicines/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);

      const result = await medicineCollection
        .find({ "author.email": email })
        .toArray();

      res.send(result);
    });

    // get all medicine data
    app.get("/allMedicines/:category", async (req, res) => {
      const result = await medicineCollection
        .find({ category: req.params.category })
        .toArray();

      res.send(result);
    });

    // get single medicine data
    app.get("/medicines/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const result = await medicineCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // get all medicines data
    app.get("/medicines", async (req, res) => {
      const result = await medicineCollection.find().toArray();
      res.send(result);
    });

    // get all users data
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();

      res.send(result);
    });

    // get user auth
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });

      res.send(user);
    });

    // get all advertise data with email
    app.get("/advertise/:email", async (req, res) => {
      const email = req.params.email;

      const result = await advertiseCollection
        .find({ "author.email": email })
        .toArray();

      res.send(result);
    });

    // get all advertise data for admin
    app.get("/advertise", verifyToken, async (req, res) => {
      const result = await advertiseCollection.find().toArray();

      res.send(result);
    });

    // get all advertise data for Home page
    app.get("/advertise_home_page", async (req, res) => {
      const result = await advertiseCollection
        .find({ status: "Add to Slide" })
        .toArray();

      res.send(result);
    });

    // get all cart data with own user email
    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;

      console.log(email);
      const result = await cartCollection
        .find({ "cart_user.email": email })
        .toArray();
      res.send(result);
    });

    // get all category data in db
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // get payment history data
    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;

      const result = await paymentCollection
        .find({ "buyerInfo.email": email })
        .toArray();
      res.send(result);
    });

    // get payment sales data
    app.get("/paymentForAdmin", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      const totalSales = result.reduce((sum, curr) => {
        return sum + parseInt(curr.price);
      }, 0);

      res.send({ totalSales });
    });

    // get payment sales data
    app.get("/paymentForUser", verifyToken, async (req, res) => {
      const email = req.user.email;
      console.log(email);
      const result = await paymentCollection
        .find({ "buyerInfo.email": email })
        .toArray();
      const totalSales = result.reduce((sum, curr) => {
        return sum + parseInt(curr.price);
      }, 0);

      res.send({ totalSales });
    });

    // get payment sales data
    app.get("/salseReport", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();

      res.send(result);
    });

    // (stripe) generate client secret key
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const price = req.body.price;
      const priceInCent = parseFloat(price) * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // add a new category data in db
    app.post("/category", verifyToken, verifyAdmin, async (req, res) => {
      const category = req.body;
      console.log(category);
      const result = await categoryCollection.insertOne(category);

      res.send(result);
    });

    // add a new medicine data on db
    app.post("/add_medicine", verifyToken, verifySeller, async (req, res) => {
      const medicine = req.body;

      const result = await medicineCollection.insertOne(medicine);

      res.send(result);
    });

    // add a new advertise data on db
    app.post("/advertise", verifyToken, verifySeller, async (req, res) => {
      const advertise = req.body;

      const result = await advertiseCollection.insertOne(advertise);

      res.send(result);
    });

    // save cart data to db
    app.post("/cart", async (req, res) => {
      const cart = req.body;

      const isExist = await cartCollection.findOne({
        medicineName: cart.medicineName,
      });

      if (isExist) return res.send({ message: "already add to cart" });

      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });

    // payment history
    app.post("/payment", async (req, res) => {
      const payment = req.body;

      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    // save user data from mongodb
    app.put("/user", async (req, res) => {
      const user = req.body;
      console.log(user);

      const query = { email: user.email };

      const isExist = await usersCollection.findOne(query);
      console.log(isExist);

      // if user again log in
      if (isExist) return res.send(isExist);

      // if new user login
      const doc = {
        ...user,
      };

      const result = await usersCollection.insertOne(doc);

      res.send(result);
    });

    // update advertise status
    app.put(
      "/advertise_status_update",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const status = req.body.status;
        const id = req.body.id;

        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            status: status,
          },
        };

        const result = await advertiseCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    // update user role
    app.put("/userRoleUpdate", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.body.id;
      const role = req.body.role;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          role: role,
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.send(result);
    });

    // delete medicine data
    app.delete(
      "/medicine_delete/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };

        const result = await medicineCollection.deleteOne(query);
        res.send(result);
      }
    );

    // delete advertise data
    app.delete(
      "/advertise/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;
        const result = await advertiseCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      }
    );

    // delete category
    app.delete("/category/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;

      const result = await categoryCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // delete cart data
    app.delete(
      "/cart-delete/:email",
      verifyToken,

      async (req, res) => {
        const email = req.params.email;

        console.log("delete cart email: ", email);

        const query = { "cart_user.email": { $regex: email } };
        const result = await cartCollection.deleteMany(query);

        console.log("delete cart", result);
        res.send(result);
      }
    );

    // cart delete api
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;

      const result = await cartCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
