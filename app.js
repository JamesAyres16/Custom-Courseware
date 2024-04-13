require('dotenv').config()
process.env.ROOT = __dirname

const path = require('path'),
      https = require('https'),
      fs = require('fs'),
      crypto = require('crypto');

const express = require('express'),
      session = require('express-session'),
      passport = require('passport');

const app = express(),
      PORT = parseInt(process.env.SITE_PORT) || 3000,
      session_data = {
        secret: crypto.randomBytes(16).toString('hex'),
        resave: false,
        saveUninitialized: false,
        cookie: { secure: true }
      };

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json()) 
app.use(express.urlencoded({ extended: true }))
app.use(session(session_data));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    console.log(`${req.method} : ${req.url}`);
    next();
})

const auth = require(path.join(__dirname, 'routes/auth'));
app.use('/', auth.router)
app.use(auth.isAuthenticated)
app.use(auth.isActive)
app.use('/glossary',    require(path.join(__dirname, 'routes/glossary')))
app.use('/courses',    require(path.join(__dirname, 'routes/courses')))
app.use('/lessons', require(path.join(__dirname, 'routes/lessons')))
app.use('/slides',      require(path.join(__dirname, 'routes/slides')))
app.use('/components',  require(path.join(__dirname, 'routes/components')))

app.get('/', (req, res) => {
    res.redirect('/courses');
});

app.use((req, res, next) => {
    res.status(404).render('error', { 
        code: 404, msg: "Sorry - We can't find what you are looking for."
    })
})

app.use((err, req, res, next) => {
    console.log(err)
    let status = err.status || 500
    res.status(status).render('error', { 
        code: status, msg: 'Sorry - Failed to Handle Request' 
    })
});


https.createServer({
    key: fs.readFileSync(
        path.join(__dirname, process.env.KEY_PATH), 'utf-8'
    ),
    cert: fs.readFileSync(
        path.join(process.env.CERT_PATH), 'utf-8'
    )
}, app).listen(PORT, () => {
    console.log(
        `\nApp listening on port ${PORT}\n` +
        `https://localhost:${PORT}\n\n`
    );
});
