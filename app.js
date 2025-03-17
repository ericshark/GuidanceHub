require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const OpenAI = require('openai');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

// Set view engine
const app = express();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
});
const User = mongoose.model('User', userSchema);

// Express Session Middleware (Must be BEFORE Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    httpOnly: true,
  }
}));

// Passport Middleware (MUST be AFTER session)
app.use(passport.initialize());
app.use(passport.session());

// Debugging Middleware
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  next();
});

// Passport Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
      }).save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Serialize & Deserialize User
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/dashboard',
  failureRedirect: '/',
}));

app.use(express.static('public'));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize OpenAI
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
  console.log('User authenticated:', req.isAuthenticated());
  console.log('Session:', req.session);
  console.log('User:', req.user);
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
    console.log('Login successful, user:', req.user);
    console.log('Session after login:', req.session);
    res.redirect('/account');
  }
);

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      console.log('Session destroyed on logout');
      res.redirect('/');
    });
  });
});

// Account Route
app.get('/account', ensureAuthenticatedWeb, (req, res) => {
  res.render('account', { user: req.user });
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
      .sort({ timestamp: -1 });
    console.log('Feedback found:', feedbackList);
    res.render('conversations', { feedback: feedbackList });
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).send('Server error');
  }
});

// Other Routes
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

app.get('/create', (req, res) => {
  res.render('create');
});

app.post('/get-questions', ensureAuthenticatedApi, async (req, res) => {
  const { category, advice_style, mood } = req.body;
  if (!category || !advice_style) {
    return res.status(400).json({ error: 'Category and advice style are required' });
  }

  const prompt = `You are an expert life coach tasked with generating thoughtful, open-ended questions to help a user gain personalized advice. Based on the category '${category}', the advice style '${advice_style}' (e.g., philosophical, practical, empathetic, or humorous), and the user's current mood '${mood}' (e.g., overwhelmed, motivated, confused, hopeful, stressed), craft exactly three open-ended questions that are highly relevant to the user's situation and mood. The questions should encourage reflection and align with the specified advice style. List the questions in the format: 1., 2., 3. Do not include any introductory text, explanations, or extra lines—just the three numbered questions.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
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
  const prompt = `Given the category '${category}', the advice style '${advice_style}', the user's current mood '${mood}', and the following questions and answers:\n${qaText}Please provide detailed and personalized advice in a concise paragraph.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));