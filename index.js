const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = "mongodb+srv://sadatcse123:yJXa1d8BZNWWxQxQ@cluster99.b9fi2ib.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
 
    const userCollection = client.db('Curier').collection('User');

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      newUser.role = 'user';
      
      console.log(newUser);
      const existingUser = await userCollection.findOne({ email: newUser.email });
      
      if (existingUser) {
        console.log('user already');
        return res.status(200).send('Email already exists');
      }
      
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.patch('/users/:role/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const role = req.params.role;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: role
          }
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    app.delete('/users/:id',async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



  app.get('/users', async (req, res) => {
    const cursor = userCollection.find();
    const result = await cursor.toArray();
    res.send(result);
})


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Courier Server is running')
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})



