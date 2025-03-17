require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const OpenAI = require('openai');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');

// Set view engine
app.set('view engine', 'ejs');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/guidancehub';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


const callbackURL = process.env.NODE_ENV === 'production'
  ? 'https://pathfinder-krpb.onrender.com'
  : 'http://localhost:3000/auth/google/callback';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: callbackURL
}, (accessToken, refreshToken, profile, done) => {
  // User serialization logic (e.g., find or create user)
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user; // Make user available in all templates
  next();
});
app.use(express.static('public')); // Serve static files (CSS, JS)
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form data

// Initialize OpenAI with API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Feedback Model
const feedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  feedback: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Authentication Middleware
const ensureAuthenticatedWeb = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

const ensureAuthenticatedApi = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// Authentication Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/home');
  }
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send('Logout failed');
    res.redirect('/');
  });
});

// Feedback Routes
app.post('/feedback', ensureAuthenticatedApi, async (req, res) => {
  const { feedback } = req.body;
  const newFeedback = new Feedback({
    userId: req.user.id,
    feedback
  });
  try {
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback saved' });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.get('/feedback', ensureAuthenticatedApi, async (req, res) => {
  try {
    const feedbackList = await Feedback.find({ userId: req.user.id });
    res.json(feedbackList);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// Conversations Page Route
app.get('/conversations', ensureAuthenticatedWeb, async (req, res) => {
  try {
    console.log('User ID:', req.user ? req.user.id : 'Not authenticated');
    const feedbackList = await Feedback.find({ userId: req.user ? req.user.id : '' })
      .sort({ timestamp: -1 }); // Sort by timestamp in descending order (most recent first)
    console.log('Feedback found:', feedbackList);
    res.render('conversations', { feedback: feedbackList });
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).send('Server error');
  }
});

// Existing Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/begin', (req, res) => {
  res.render('begin');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/home', (req, res) => {
  res.render('index');
});

app.get('/about-us', (req, res) => {
  res.redirect('/about');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});



// New API Endpoints for Advice Form
// ... (previous imports and middleware remain the same) ...

// New API Endpoints for Advice Form
app.post('/get-questions', ensureAuthenticatedApi, async (req, res) => {
  const { category, advice_style, mood } = req.body;
  if (!category || !advice_style) {
    return res.status(400).json({ error: 'Category and advice style are required' });
  }

  const prompt = `You are an expert life coach tasked with generating thoughtful, open-ended questions to help a user gain personalized advice. Based on the category '${category}', the advice style '${advice_style}' (e.g., philosophical, practical, empathetic, or humorous), and the user's current mood '${mood}' (e.g., overwhelmed, motivated, confused, hopeful, stressed), craft exactly three open-ended questions that are highly relevant to the user's situation and mood. The questions should encourage reflection and align with the specified advice style. List the questions in the format: 1., 2., 3. Do not include any introductory text, explanations, or extra lines—just the three numbered questions.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Upgraded to gpt-4o-mini
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7, // Optional: Adjust for creativity (0.7 is a good balance)
      max_tokens: 150 // Optional: Limit response length to ensure concise questions
    });
    const questionsText = completion.choices[0].message.content;
    const questions = questionsText
      .split('\n')
      .filter((line) => line.match(/^\d\./))
      .map((line) => line.replace(/^\d\.\s*/, '').trim());
    if (questions.length !== 3) throw new Error('Did not receive exactly 3 questions');
    res.json({ questions });
  } catch (error) {
    console.error('Error in /get-questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// ... (rest of app.js remains the same) ...

app.post('/get-advice', ensureAuthenticatedApi, async (req, res) => {
  const { category, advice_style, mood, question0, question1, question2, answer0, answer1, answer2 } = req.body;
  if (!category || !advice_style) {
    return res.status(400).json({ error: 'Category and advice style are required' });
  }

  const qaPairs = [
    { question: question0, answer: answer0 },
    { question: question1, answer: answer1 },
    { question: question2, answer: answer2 },
  ];
  let qaText = '';
  qaPairs.forEach((qa, index) => {
    qaText += `Question ${index + 1}: ${qa.question}\nAnswer ${index + 1}: ${qa.answer}\n`;
  });
  const prompt = `Given the category '${category}', the advice style '${advice_style}', the user's current mood '${mood}', and the following questions and answers:\n${qaText}Please provide detailed and personalized advice just give me a concise paragragh nothing more.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Upgraded to gpt-4o-mini
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500 // Adjust for longer advice
    });
    const advice = completion.choices[0].message.content;

    const newFeedback = new Feedback({
      userId: req.user.id,
      feedback: advice,
      timestamp: new Date()
    });
    await newFeedback.save();
    console.log('Feedback saved:', newFeedback);

    res.json({ advice });
  } catch (error) {
    console.error('Error in /get-advice:', error);
    res.status(500).json({ error: 'Failed to get advice' });
  }
});
// 404 Handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});