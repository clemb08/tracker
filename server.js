const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(
  process.env.MLAB_URI || "mongodb://localhost:27017/exercise-track"
);

const connection = mongoose.connection;

connection.on("error", console.log.bind(console, "connection error: "));
connection.once("open", () => {
  console.log("MongoDB is connected");
});

const Schema = mongoose.Schema;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const userSchema = new Schema({
  username: String,
  exercise: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});

const User = mongoose.model("User", userSchema);

const createUser = (username, done) => {
  if (username == null) {
    console.log("Give us a name");
  } else {
    User.findOne({ username: username }, (err, data) => {
      if (data == null) {
        let newUser = new User({
          username: username,
          exercise: []
        });
        newUser.save((err, data) => {
          if (err) return done(err);
          done(null, data);
        });
        console.log("user saved");
      } else {
        console.log("error: user already exist");
      }
    });
  }
};

//const addExercise = (userId, activity, done) => {

//}

app.post("/api/exercise/new-user", (req, res) => {
  createUser(req.body.username, (err, data) => {
    if (err) return res.send({ error: "Error Create User" });
    User.findOne({ username: req.body.username }, (err, data) => {
      res.json({ _id: data._id, username: data.username });
    });
  });
});

app.post("/api/exercise/add", (req, res) => {
  let dateInsert = req.body.date;

  if (req.body.date == "") {
    dateInsert = new Date();
    dateInsert = dateInsert.toDateString();
    //     console.log(dateInsert)
  } else if (req.body.date == null) {
    dateInsert = new Date();
    dateInsert = dateInsert.toDateString();
  } else {
    //  dateInsert = req.body.date;
    dateInsert = new Date(req.body.date).toDateString();
  }
  //  console.log("dateInsert",dateInsert)

  if (req.body.description) {
    if (req.body.duration) {
      if (req.body.userId) {
        User.findOneAndUpdate(
          { _id: req.body.userId },
          {
            $push: {
              exercise: {
                description: req.body.description,
                duration: parseInt(req.body.duration),
                date: dateInsert
              }
            }
          },
          { new: true, upsert: true },
          (err, data) => {
            if (err) return res.send(err);
            res.send({
              username: data.username,
              description: req.body.description,
              duration: parseInt(req.body.duration),
              _id: data._id,
              date: dateInsert
            });
          }
        );
      } else {
        res.send({ error: "userId is required" });
      }
    } else {
      res.send({ error: "duration is required" });
    }
  } else {
    res.send({ error: "description is required" });
  }
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) return console.log("Error: ", err);
    let users = [];
    for (let user in data) {
      users.push({
        _id: data[user]._id,
        username: data[user].username
      });
    }
    res.json(users);
  });
});

//functions
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

app.get("/api/exercise/log/", (req, res) => {
  
var { userId, from, to, limit } = req.query;

  //console.log("from",fromDate);
  User.findById({ _id: userId }, (err, data) => {
    if (err) return res.send(err);
    let userTest = userId;
    // console.log(userTest);
    var exercises = data.exercise;
    var log = exercises.map(item => {
      return {
        description: item.description,
        duration: parseInt(item.duration),
        date: item.date.toDateString()
      };
    });
    // I used this solution as a guide from this block https://glitch.com/edit/#!/lean-natural-cough?path=server.js%3A38%3A19
    if (from) {
      var fromDate = new Date(from);
      log = log.filter(item => new Date(item.date) >= fromDate);
      fromDate = fromDate.toDateString();
    }

    if (to) {
      var toDate = new Date(to);
      log = log.filter(item => new Date(item.date) <= toDate);
      toDate = toDate.toDateString();
    }

    if (limit) {
      log = log.slice(0, +limit);
    }
    //console.log(exercises.length);
    let fromRep = new Date(from).toDateString();

    // let toRep = new Date(to).toDateString();
    //  console.log("fromDate", fromDate)

    res.json({
      _id: data._id,
      username: data.username,
      from: fromDate,
      to: toDate,
      count: log.length,
      log: log
    });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
