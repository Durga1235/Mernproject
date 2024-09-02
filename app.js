const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
// Set the view engine to EJS
app.set('view engine', 'ejs');
// Specify the directory where your EJS files are located
app.set('views', __dirname + '/views');
// Serve static files (like CSS, images)
app.use(express.static('public'));
// Set up body parser middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Connect to MongoDB
mongoose.connect('mongodb://localhost/myDatabase', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
// Define a schema for user collection
const userSchema = new mongoose.Schema({
    name: String,
    password: String
});
// Define a model based on the schema
const User = mongoose.model('User', userSchema);

// Define a schema for patient details
const userSchema1 = new mongoose.Schema({
    name: String,
    age: Number,
    email: String,
    phoneNumber: String
});
// Define a model based on the schema
const Patient = mongoose.model('Patient', userSchema1);

//define a schemafor appointment details
const appointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User1' },
    date: Date,
    scanOrXray: String,
    subtype: String,
    cost: Number
});
// Define a model based on the schema
const Appointment = mongoose.model('Appointment', appointmentSchema);
// Route for rendering the register page
app.get('/register', (req, res) => {
    res.render('register');
});
// Route for user registration
app.post('/register', async (req, res) => {
    const { name, password } = req.body;
    try {
        // Check if the username already exists in the database
        const existingUser = await User.findOne({ name });

        if (existingUser) {
            // If username already exists, return error message
            res.status(409).send('Username already exists');
        } else {
            // Create a new user with the provided username and password
            const newUser = new User({ name, password });
            await newUser.save();
            // Return success message
            //res.status(201).send('Registration successful');
            res.render('login');
        }
    } catch (error) {
        // If an error occurs, return error message
        res.status(500).send('Internal server error');
    }
});
// Route for rendering the login page
app.get('/login', (req, res) => {
    res.render('login');
});
// Route for user login
app.post('/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        // Find user in database by username and password
        const user = await User.findOne({ name, password });
        if (user) {
            // If user exists, return success message
            //res.status(200).send('Login successful');
            res.render('dashboard');
        } else {
            // If user doesn't exist, return error message
            res.status(401).send('Invalid username or password');
        }
    } catch (error) {
        // If an error occurs, return error message
        res.status(500).send('Internal server error');
    }
});
// Route for rendering the dashboard
app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});
// Route for handling the selection of scan or X-ray type
app.post('/dashboard', (req, res) => {
    const { scanType, xrayType } = req.body;
    let type='';
    let subtypes=[];
    if (scanType) {
        type = scanType;
        if (scanType === 'MRI') {
            subtypes = [
                { name: 'Brain MRI', cost: 500 },
                { name: 'Spine MRI', cost: 400 },
                { name: 'Abdominal MRI', cost: 600 }
            ];
        } else if (scanType === 'CT Scan') {
            subtypes = [
                { name: 'Head CT', cost: 300 },
                { name: 'Chest CT', cost: 400 },
                { name: 'Abdomen CT', cost: 350 }
            ];
        }
        else if (scanType === 'Ultrasound') {
            subtypes = [
                { name: 'Hysterosonography', cost: 500 },
                { name: 'Abdomen Ultrasound', cost: 400 },
                { name: 'Ultrasound Thyroid', cost: 550 }
            ];
        }
    } else if (xrayType) {
        type = xrayType;
        if (xrayType === 'Chest X-Ray') {
            subtypes = [
                { name: 'PA View', cost: 200 },
                { name: 'Lateral View', cost: 250 }
            ];
        } else if (xrayType === 'Dental X-Ray') {
            subtypes = [
                { name: 'Bitewing X-Ray', cost: 150 },
                { name: 'Panoramic X-Ray', cost: 180 }
            ];
        }
        if (xrayType === 'Hands X-Ray') {
            subtypes = [
                { name: 'Posteroanterior', cost: 300 },
                { name: 'Lateral View', cost: 350 },
                { name: 'Oblique View', cost: 400 }
            ];
        } else if (xrayType === 'Legs X-Ray') {
            subtypes = [
                { name: 'Outlet view', cost: 150 },
                { name: 'Lateral view', cost: 180 },
                { name: 'Mortise view',cost: 350}
            ];
        }
    }

    res.render('subtypes', { type, subtypes });
});
// Route for rendering the sub-types page
app.get('/subtypes', (req, res) => {
    res.render('subtypes');
});
// Route for rendering the user details form page
app.get('/userDetailsForm', (req, res) => {
    const { type, subtype, cost } = req.query;
    res.render('userDetailsForm', { type, subtype, cost });
});
// Route for storing user details in the database
app.post('/userDetailsForm', async (req, res) => {
    const { name, age, email, phoneNumber, type, subtype, cost } = req.body;
    try {
        const user1 = new Patient({ name, age, email, phoneNumber });
        await user1.save();
        res.render('payment', { userId: user1._id, type, subtype, cost, error: null });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Failed to create user.');
    }
});
// Route for processing payment
app.post('/payment', (req, res) => {
    const { userId, type, subtype, cost, paymentMethod, paymentInfo } = req.body;
    let finalCost = cost;

    if (paymentMethod === 'PhonePe' || paymentMethod === 'GooglePe') {
        if (!/^\d{10}@[a-zA-Z]{3}$/.test(paymentInfo)) {
            return res.render('payment', { userId, type, subtype, cost, error: 'Invalid PhonePe/GooglePe ID format.' });
        }
        finalCost = cost * 0.98; // 2% discount
    } else if (paymentMethod === 'CreditCard') {
        if (!/^\d{12}$/.test(paymentInfo)) {
            return res.render('payment', { userId, type, subtype, cost, error: 'Invalid Credit Card number.' });
        }
        finalCost = cost * 0.95; // 5% discount
    } else if (paymentMethod === 'DebitCard') {
        if (!/^\d{12}$/.test(paymentInfo)) {
            return res.render('payment', { userId, type, subtype, cost, error: 'Invalid Debit Card number.' });
        }
    } else {
        return res.render('payment', { userId, type, subtype, cost, error: 'Invalid payment method.' });
    }
    res.render('bookAppointment', { userId, type, subtype, cost: finalCost });
});
// Route for booking appointment
app.post('/bookAppointment', async (req, res) => {
    const { userId, type, subtype, cost, date } = req.body;
    try {
        const existingAppointments = await Appointment.find({ date, subtype }).countDocuments();
        if (existingAppointments >= 5) {
            return res.status(400).send('Slots are fully booked.');
        }
        const appointment = await Appointment.create({ userId, date, scanOrXray: type, subtype, cost });
        res.render('appointmentDetails', { date, time: '10:00 AM', type, subtype });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).send('Failed to create appointment.');
    }
});
app.get('/', (req, res) => {
    res.render('home');
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});