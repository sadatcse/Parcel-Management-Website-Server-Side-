const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
    const ParcelCollection = client.db('Curier').collection('Parcel');
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    //   res.send({ token });
    // })

    app.post('/parcels', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await ParcelCollection.insertOne(item);
      res.send(result);
    });

    app.get('/parcels/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const cursor = ParcelCollection.find({ SenderEmail: email });
        const result = await cursor.toArray();
        const count = result.length;
    
        res.send({ count, data: result });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get('/parcelBook', async (req, res) => {
      const cursor = ParcelCollection.find();
      const parcels = await cursor.toArray();
    
      const senderEmailCounts = {};
    
      parcels.forEach(parcel => {
        const senderEmail = parcel.SenderEmail;
        if (!senderEmailCounts[senderEmail]) {
          senderEmailCounts[senderEmail] = 1;
        } else {
          senderEmailCounts[senderEmail]++;
        }
      });

      
    
      const senderEmailListWithCount = Object.keys(senderEmailCounts).map(email => ({
        SenderEmail: email,
        Count: senderEmailCounts[email]
      }));
    
      res.send(senderEmailListWithCount);
    });

    app.get('/dparcels/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const filter = { DeliveryManEmail: email };
        const parcels = await ParcelCollection.find(filter).toArray();
        res.send(parcels);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    app.get('/parcels', async (req, res) => {
      const cursor = ParcelCollection.find();
      const result = await cursor.toArray();
      res.send(result);
  })

  app.get('/indivisualparcels/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    const result = await ParcelCollection.findOne(filter);
    res.send(result);
})


app.patch('/patchparcels/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedMenus = { ...req.body };
  console.log(updatedMenus);
  
  if (updatedMenus.hasOwnProperty('_id')) {
    delete updatedMenus._id;
  }

  try {
    const result = await ParcelCollection.updateOne(filter, { $set: updatedMenus });
    if (result.modifiedCount === 1) {
      res.json({ message: 'Parcel updated successfully' });
    } else {
      res.status(404).json({ error: 'Parcel not found or not updated' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
  



  
  app.patch('/parcels/:status/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const status = req.params.status;
      console.log(status);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ParcelStatus: status
        }
      };
      const result = await ParcelCollection.updateOne(filter, updatedDoc);
      res.send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });


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

    app.patch('/bookupdate/:email', async (req, res) => {
      try {
        const iemail = req.params.email;
        console.log(iemail);
        const user = await userCollection.findOne({ email: iemail });
    
        let updatedCount = 0;
        if (user && user.ParcelBook !== undefined) {
          updatedCount = user.ParcelBook + 1;
        }
    
        const filter = { email: iemail };
        const updatedDoc = {
          $set: {
            ParcelBook: updatedCount
          }
        };
    
        const result = await userCollection.updateOne(filter, updatedDoc);
        console.log(result);
        res.send(result);
      } catch (err) {
        res.status(500).send(err.message);
      }
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

app.get('/deliveryman', async (req, res) => {
  const cursor = userCollection.find({ "role": "deliveryman" });
  const result = await cursor.toArray();
  res.send(result);
})

app.get('/users/admin/:email', async (req, res) => {
  const email = req.params.email;
  const user = await userCollection.findOne({ email: email });

  if (user) {

    res.send(user.role);
  } else {
    res.status(404).send('User not found');
  }
});

app.get('/users/:email', async (req, res) => {
  const email = req.params.email;
  const user = await userCollection.findOne({ email: email });

  if (user) {

    res.send(user);
  } else {
    res.status(404).send('User not found');
  }
});


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



