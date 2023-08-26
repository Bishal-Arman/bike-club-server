const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middle-ware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  // console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  // console.log("get the token", token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// console.log(process.env.DB_USER);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7wqtq.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollections = client.db("bike-club").collection("services");

    // services
    app.get("/services", async (req, res) => {
      const cursor = servicesCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollections.findOne(query, options);
      res.send(result);
    });

    // booking
    const bookingCollections = client.db("bike-club").collection("booking");

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const result = await bookingCollections.insertOne(booking);
      res.send(result);
    });

    // to show booking data with the help of mail
    app.get("/booking", verifyJWT, async (req, res) => {
      // console.log(req.query.email);
      // console.log(req.headers.authorization);
      const decoded = req.decoded;
      if (decoded.email != req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollections.find(query).toArray();
      res.send(result);
    });

    // delete
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollections.deleteOne(query);
      res.send(result);
    });

    //  update
    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = req.body;
      // console.log(update);
      const updateDoc = {
        $set: {
          status: update.status,
        },
      };
      const result = await bookingCollections.updateOne(query, updateDoc);
      res.send(result);
    });

    // jwt

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "72h",
      });
      // console.log(token);
      res.send({ token });
    });

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
  res.send("bike-club is running ");
});

app.listen(port, () => {
  console.log("server is running on port", port);
});
