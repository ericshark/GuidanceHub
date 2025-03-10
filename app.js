require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const OpenAI = require('openai'); // Add OpenAI package

// Set view engine
app.set('view engine', 'ejs');

// Log the API key (for debugging, remove in production)
console.log('OpenAI Key:', process.env.KEY);

// Initialize OpenAI with API key from .env
const openai = new OpenAI({
  apiKey: process.env.KEY,
});

// Middleware
app.use(express.static('public')); // Serve static files (CSS, JS)
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form data

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
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

app.get('/create', (req, res) => {
  res.render('create');
});

// New API Endpoints for Advice Form
app.post('/get-questions', async (req, res) => {
  const { category, advice_type, custom_category } = req.body;
  const effectiveCategory = category === 'custom' && custom_category ? custom_category : category;
  const prompt = `Based on the category '${effectiveCategory}' and the advice type '${advice_type}', provide exactly five questions to help give personalized advice. Make the questions open ended List them as 1., 2., 3., 4., 5.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const questionsText = completion.choices[0].message.content;
    const questions = questionsText
      .split('\n')
      .filter((line) => line.match(/^\d\./))
      .map((line) => line.replace(/^\d\.\s*/, '').trim());
    if (questions.length !== 5) throw new Error('Did not receive exactly 5 questions');
    res.json({ questions });
  } catch (error) {
    console.error('Error in /get-questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

app.post('/get-advice', async (req, res) => {
  const { category, advice_type, custom_category, question0, question1, question2, question3, question4, answer0, answer1, answer2, answer3, answer4 } = req.body;
  const effectiveCategory = category === 'custom' && custom_category ? custom_category : category;
  const qaPairs = [
    { question: question0, answer: answer0 },
    { question: question1, answer: answer1 },
    { question: question2, answer: answer2 },
    { question: question3, answer: answer3 },
    { question: question4, answer: answer4 },
  ];
  let qaText = '';
  qaPairs.forEach((qa, index) => {
    qaText += `Question ${index + 1}: ${qa.question}\nAnswer ${index + 1}: ${qa.answer}\n`;
  });
  const prompt = `Given the category '${effectiveCategory}', the advice type '${advice_type}', and the following questions and answers:\n${qaText}Please provide detailed and personalized advice.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const advice = completion.choices[0].message.content;
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