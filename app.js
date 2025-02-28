require('dotenv').config()
const express = require('express')
const app = express()
const morgan = require('morgan')
app.set('view engine', 'ejs')
console.log(process.env.KEY)

app.listen(3000)

app.use(express.static('public'))

app.use(morgan('dev'))

app.get('/', (req, res)=>{
    res.render('index',{title: 'working lol'})
})

app.get('/about', (req, res)=>{
    res.render('about')
})
app.get('/ejs', (req, res)=>{
    res.render('index')
})

app.get('/about-us',(req, res)=>{
    res.redirect('/about')
})
app.get('/create', (req, res)=>{
    res.render('create')
})

app.use((req, res)=>{
    res.status(404).render('404')
    
})
// app.use((req, res)=>{
//     res.status(404).sendFile('./views/404.html',{root:__dirname})
// })