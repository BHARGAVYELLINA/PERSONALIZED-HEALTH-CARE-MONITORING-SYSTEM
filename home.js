const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const encoder = bodyParser.urlencoded();
const bcrypt = require("bcrypt");

const app = express();
const hostname = "0.0.0.0"
const port = 3000;

const register = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "bhargav",
    database: "credentials"
});

const activity_data = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bhargav',
    database: 'health_monitoring'
});

const fasting = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bhargav',
    database: 'fasting'
});

const pool = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bhargav',
    database: 'doctors'
});

const poolgou = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bhargav',
    database: 'waterlog'
}); 

pool.connect((err)=>{
    if(err) throw err;
});

poolgou.connect((err)=>{
    if(err) throw err;
});

activity_data.connect((err) => {
    if (err) throw err;
});

fasting.connect((err) => {
    if (err) throw err;
});

register.connect(function(error){
    if (error) throw error
    else console.log("connected to the database successfully!")
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

app.get("/l",function(req,res){
    res.sendFile(path.join(__dirname, 'REGISTER', "/login.html"));
});

app.get("/s",function(req,res){
    res.sendFile(path.join(__dirname, 'REGISTER', "/signup.html"));
});

app.get('/graphs', (req, res) => {
    res.sendFile(path.join(__dirname, 'GRAPHS', 'graph.html'));
});

app.get("/fastingpage", function(req, res) {
    res.sendFile(path.join(__dirname, 'FASTING', 'fasting.html'));
});

app.get('/appointmentform', (req, res) => {
    res.sendFile(path.join(__dirname, 'appointment', 'appointmentform.html'));
});

app.get('/appointmentindex', (req, res) => {
    res.sendFile(path.join(__dirname, 'appointment', 'appointmentindex.html'));
});

app.get('/acknowledge', async (req, res) => {
    res.sendFile(path.join(__dirname, 'appointment', 'acknowledge.html'));
});

app.get('/waterlog', async (req, res) => {
    res.sendFile(path.join(__dirname, 'waterlog', 'waterlog.html'));
});

app.get('/calorietracking', async (req, res) => {
    res.sendFile(path.join(__dirname, 'CalorieTracking', 'calorietracking.html'));
});

app.post("/login", function(req,res){
    var email = req.body.email;
    var password = req.body.password;
    console.log(email,password);
    register.query("SELECT * FROM users_credentials_data WHERE email = ?", [email], function(error, results, fields) {
        console.log(results);
        if (error) {
            console.error("Error in login query:", error);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length === 0) {
            return res.redirect("/l");
        }

        const user = results[0];
        bcrypt.compare(password, user.password, function(err, result) {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).send("Internal Server Error");
            }
            
            if (result) {
                return res.redirect("/");
            } else {
                return res.redirect("/l");
            }
        });
    });
});

app.post("/signup", function(req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var phonenumber = req.body.phonenumber;

    register.query("SELECT * FROM users_credentials_data WHERE email = ?", [email], function(error, results, fields) {
        if (error) {
            console.error("Error in signup query:", error);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length > 0) {
            return res.status(500).send("Email already in use. Please choose another one.");
        } else {
            bcrypt.hash(password, 10, function(err, hashedPassword) {
                if (err) {
                    console.error("Error hashing password:", err);
                    return res.status(500).send("Internal Server Error");
                }

                register.query("INSERT INTO users_credentials_data (name, email, phonenumber, password) VALUES (?, ?, ?, ?)", [name, email, phonenumber, hashedPassword], function(error, results, fields) {
                    if (error) {
                        console.error("Error in signup query:", error);
                        return res.status(500).send("Internal Server Error");
                    }

                    return res.redirect("/");
                });
            });
        }
    });
});

app.get('/get_data', (req, res) => {
    activity_data.query('SELECT * FROM users_activity_data', (error, results, fields) => {
        if (error) throw error;
        const data = {
            dates: [],
            steps: [],
            calories: [],
            sleepHours: [],
            exercisesData: {},
            caloriesBurned: [],
            screenTime: [],
            fasting_period: [],
            eating_period: []
        };
        results.forEach(row => {
            data.dates.push(row.date.toISOString().split('T')[0]);
            data.steps.push(row.steps);
            data.calories.push(row.calories);
            data.sleepHours.push(row.sleep_hours);
            data.caloriesBurned.push(row.calories_burned);
            data.screenTime.push(row.screen_time);
            if (data.exercisesData.hasOwnProperty(row.exercises)) {
                data.exercisesData[row.exercises] += 1;
            } else {
                data.exercisesData[row.exercises] = 1;
            }
        });
        fasting.query('SELECT * FROM fasting_periods', (err, result, fields) => {
            if (err) throw err;
            result.forEach(row => {
                data.fasting_period.push(row.duration);
                data.eating_period.push(row.endduration);
            });
            
            const filePath = path.join(__dirname, "GRAPHS", 'data.json');
            fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
                if (err) {
                    console.error('Error writing to file', err);
                    return res.status(500).json({ error: 'Failed to save data to file' });
                }
                
                res.json(data);
            });
        });
    });
});


app.post('/fasting', (req, res) => {
    const { startDate, startTime, endDate, endTime } = req.body;
    const startDateTime = startDate + ' ' + startTime;
    const endDateTime = endDate + ' ' + endTime;
    const duration = calculateDuration(startDateTime, endDateTime);
    const endduration = 24-duration;
    const query = 'INSERT INTO fasting_periods (start_date, start_time, end_date, end_time, duration, endduration) VALUES (?, ?, ?, ?, ?, ?)';
    fasting.query(query, [startDate, startTime, endDate, endTime, duration, endduration], (err, result) => {
        if (err) throw err;
        return res.redirect('/graphs');
    });
});

async function getDoctorsBySpecialization(specialization) {
    pool.query('SELECT * FROM doctors WHERE speciality = ?', [specialization],(err,res)=>{
        if(err) throw err;
        return res;
    });    
}

async function insertAppointment(reqq) {
    console.log(reqq);
    pool.query('INSERT INTO appointments(doctor_id, patient_id, patient_name, patient_contact, appointment_date, emergency_flag) VALUES(?, ?, ?, ?, ?, ?)', [parseInt(reqq['doctorId']), parseInt(reqq['userId']), reqq['formData']['fullName'], parseInt(reqq['formData']['contactInfo']), new Date(reqq['formData']['preferredDateTime']), reqq['formData']['urgencyLevel']], (err,res)=>{
      if(err){
        console.log("doctorerror");
      }
      else{
        console.log("inserted doctor");
      }
    });
}

async function getUserData(userid) {
    console.log(userid,'here');
    pool.query('SELECT * FROM users WHERE user_id = ?', [parseInt(userid)], (err,res)=>{
      if(err){
        console.log("userdataerror");
        throw err;
      }
      console.log(res);
      return res;
    });
}

app.post('/getDoctors', async (req, res) => {
    const { specialization } = req.body;
    console.log(specialization);
    try {
        const doctors = await getDoctorsBySpecialization(specialization);
        res.json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).send('Error fetching doctors');
    }
});

app.post('/appointmentformfillstoreData', async (req, res) => {
    const reqq = req.body;
    console.log(reqq);
    try {
        await insertAppointment(reqq);
        const filePath = path.join(__dirname, 'acknowledge.html');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading the HTML file:", err);
                res.status(500).send('Internal Server Error');
            } else {
                console.log('Appointment inserted successfully');
                res.status(200).send(data);
            }
        });
    } catch (error) {
        console.error('Error inserting appointment:', error);
        res.status(500).send('Error at the database side');
    }
});

app.post('/getUserData', async (req, res) => {
    const { user_id } = req.body;
    console.log(user_id);
    try {
        const contents = await getUserData(user_id);
        res.json(contents);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Error fetching user data');
    }
});

function calculateDuration(startDateTime, endDateTime) {
    const startTimestamp = new Date(startDateTime).getTime();
    const endTimestamp = new Date(endDateTime).getTime();
    const durationMs = endTimestamp - startTimestamp;
    const durationHours = durationMs / (1000 * 60 * 60);
    return durationHours.toFixed(2);
}

async function enterUserWaterLog(reqq){
    console.log(reqq);
    poolgou.query('INSERT INTO water_tracker VALUES(?, ?, ?, ?, ?, ?)', [parseInt(reqq['userId']), parseFloat(reqq['goal']), reqq['date'], reqq['time'], parseFloat(reqq['consumedLiters']), parseFloat(reqq['percentageReached'])], (err,res)=>{
        if(err){
            console.log(err);
        }
        else{
            console.log("data inserted into water_tracker");
        }
    });
}

app.post('/consumeWater',async (req, res)=>{
    const reqq = req.body;
    try{
      enterUserWaterLog(reqq);
      console.log(reqq);
      res.status(500).send('Internal Server Error');
    }catch(error){
      console.error('Error inserting appointment:', error);
      res.status(500).send('Error at the database side');
    }
});

app.listen(port, hostname, () => {
    console.log(`Server running on port ${port}`);
});