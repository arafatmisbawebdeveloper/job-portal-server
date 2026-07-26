const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');

app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_password}@cluster0.l2zb9kx.mongodb.net/?appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //job related api
    
    const jobCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client.db("jobPortal").collection("job_applications");
    app.get('/jobs', async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    //job application related api
    app.post('/job-applications', async (req, res) => {
      const applicationData = req.body;
      const result = await jobApplicationCollection.insertOne(applicationData);
      res.send(result);
    });
    //auth related API

    app.post('/jwt',(req,res) =>{
      const user = req.body;
      const token = jwt.sign(user,process.env.jwt_access_token,{expiresIn:'1h'});
      res.cookie('token',token,{
        httpOnly:true,
        secure: false,
      })
      .send({success:true})
    });

    app.post('/logout',(req,res)=>{
      res.clearCookie('token',{},{
        httpOnly:true,
        secure:false,
      })
      .send({success:true})
    })
    //application deletion 
    app.delete('/job-applications/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await jobApplicationCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid application id' });
      }
    });

    //get job data by email
    app.get('/job-application',async (req,res) => {
      const email = req.query.email;
      const query = {userEmail:email};
      const result = await jobApplicationCollection.find(query).toArray();
      //unusual way to applicant's data using email

      for(const application of result) {
        const query1 = {_id: new ObjectId(application.jobId)};
        const job = await jobCollection.findOne(query1);
        
        if(job) {
          application.title = job.title;
          application.company = job.company;
          application.location = job.location;
          application.company_logo = job.company_logo;
        }
      }
      
      
      
      res.send(result);
    })

} finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Welcome to the Job portal API');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});