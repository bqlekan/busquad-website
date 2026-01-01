require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Quote = require('./models/Quote');
const Project = require('./models/Project');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.log('DB Connection Error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.currentUser = req.session.user;
    next();
});

// Image Upload Setup
// NOTE: For live website (Render), files in 'public' are temporary. 
// For a beginner tutorial, we use local storage, but images might disappear on free hosting restarts.
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
        cb(null, 'img-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// Home
app.get('/', async (req, res) => {
    const projects = await Project.find({});
    res.render('index', { projects });
});

// Auth
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        // First user ever registered becomes Admin automatically
        const isFirstUser = (await User.countDocuments({})) === 0;
        const newUser = new User({ name, email, password: hashedPassword, isAdmin: isFirstUser });
        await newUser.save();
        req.flash('success_msg', 'Registered! Please login.');
        res.redirect('/login');
    } catch(e) {
        req.flash('error_msg', 'Error registering.');
        res.redirect('/register');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        if(user.isAdmin) return res.redirect('/admin');
        return res.redirect('/');
    }
    req.flash('error_msg', 'Invalid credentials');
    res.redirect('/login');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Submit Quote
app.post('/quote', upload.single('quoteImage'), async (req, res) => {
    const { customerName, email, service, details } = req.body;
    const referenceImage = req.file ? `/uploads/${req.file.filename}` : null;
    const newQuote = new Quote({ customerName, email, service, details, referenceImage });
    await newQuote.save();
    req.flash('success_msg', 'Quote sent! We will contact you.');
    res.redirect('/#quote');
});

// Admin
app.get('/admin', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) return res.redirect('/login');
    const quotes = await Quote.find({}).sort({date: -1});
    res.render('admin', { quotes });
});

app.post('/admin/project', upload.single('projectImage'), async (req, res) => {
    const { title, description } = req.body;
    if(req.file) {
        const newProject = new Project({ 
            title, 
            description, 
            imageUrl: `/uploads/${req.file.filename}` 
        });
        await newProject.save();
    }
    res.redirect('/admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));