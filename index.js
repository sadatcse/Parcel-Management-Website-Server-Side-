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
    // await client.connect();

    const userCollection = client.db('Curier').collection('User');
    const ParcelCollection = client.db('Curier').collection('Parcel');
    const ReviewCollection = client.db('Curier').collection('Review');

    app.patch('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedUser = { ...req.body };
        delete updatedUser._id;
        console.log('Filter:', filter); 
        console.log('Updated User:', updatedUser);
    
        if (Object.keys(updatedUser).length === 0) {
          return res.status(400).json({ error: 'No fields to update provided' });
        }
        const result = await userCollection.updateOne(filter, { $set: updatedUser });
    
        console.log('Update Result:', result); 
    
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        if (result.modifiedCount === 1) {
          return res.json({ message: 'User updated successfully' });
        } else {
          return res.status(500).json({ error: 'Failed to update user' });
        }
      } catch (error) {
        console.error('Server Error:', error); 
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
    

    app.get('/parceldata', async (req, res) => {
      try {
        const aggregationPipeline = [
          {$group: {_id: {year: { $year: { $toDate: "$ParcelCreateTime" } },month: { $month: { $toDate: "$ParcelCreateTime" } }},
            count: { $sum: 1 }}},
          { $sort: { "_id.year": 1, "_id.month": 1 } }];
        const result = await ParcelCollection.aggregate(aggregationPipeline).toArray();
        res.json(result);} 
        catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });}});

    app.get('/deliveryman', async (req, res) => {
      try {
        const deliverymen = await userCollection.find({ role: 'deliveryman' }).toArray();
        const promises = deliverymen.map(async (deliveryman) => {
          const demail = deliveryman.email;
          const filter = { 'deliveryMan.email': demail };
          const filter2 = { 'DeliveryManEmail': demail, 'ParcelStatus': 'Delivery' };
          const userData = {name: deliveryman.name || '',Mobile: deliveryman.mobile || '',Photourl: deliveryman.Photourl || ''};
          const pipeline = [{ $match: filter },{$group: {_id: null,reviews: { $push: '$$ROOT' },averageRating: { $avg: '$rating' }}}];
          const result = await ReviewCollection.aggregate(pipeline).toArray();
          const result2 = await ParcelCollection.find(filter2).toArray();
          const reviews = result.length > 0 ? result[0].reviews : [];
          const averageRating = result.length > 0 ? result[0].averageRating : 0;
          const totalResults = result2.length;
          return {userData,averageRating,ParcelDelivery: totalResults};});
          const userDataList = await Promise.all(promises);
          res.status(200).json({ userDataList });
           } catch (error) {
          res.status(500).json({ error: error.message });}});

          app.get('/statistics', async (req, res) => {
            try {
                const users = await userCollection.find({ role: 'user' }).toArray();
                const parcelsDelivery = await ParcelCollection.find({ ParcelStatus: 'Delivery' }).toArray();
                const parcelsBooks = await ParcelCollection.find({ ParcelStatus: 'pending' }).toArray();
                const Parcely= await ParcelCollection.find({ ParcelStatus: 'On The Way' }).toArray();
                const Parcelc= await ParcelCollection.find({ ParcelStatus: 'cancel' }).toArray();       
                const numberOfUsers = users.length;
                const numberOfParcelDeliveries = parcelsDelivery.length;
                const numberOfParcelBook = parcelsDelivery.length + parcelsBooks.length + Parcely.length + Parcelc.length;
        
                res.status(200).json({ numberOfUsers, numberOfParcelBook, numberOfParcelDeliveries });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });


    app.get('/reviews', async (req, res) => {
      const cursor = ReviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/alldeliveryman', async (req, res) => {
      const cursor = userCollection.find({ "role": "deliveryman" });
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/reviews/:user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const role = req.params.user;
        const filter = { [`${role}.email`]: email };
        const pipeline = [
          { $match: filter },{$group: {_id: null,reviews: { $push: '$$ROOT' },averageRating: { $avg: '$rating' }}}];
        const result = await ReviewCollection.aggregate(pipeline).toArray();
        const reviews = result.length > 0 ? result[0].reviews : [];
        const averageRating = result.length > 0 ? result[0].averageRating : 0;
        res.send({ reviews, averageRating });
      } catch (err) {res.status(500).send(err.message);}});


    app.post('/reviews', async (req, res) => {
      const item = req.body;
      const result = await ReviewCollection.insertOne(item);
      res.send(result);
    });


    app.post('/parcels', async (req, res) => {
      const item = req.body;
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
      if (existingUser) {console.log('user already');return res.status(200).send('Email already exists');}
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

    app.delete('/users/:id', async (req, res) => {
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



