const express = require('express'),
      passport = require('passport'),
      LocalStrategy = require('passport-local'),
      crypto = require('crypto'),
      path = require('path'),
      { PrismaClient } = require('@prisma/client');


const router = express.Router(),
      prisma = new PrismaClient()

const {
    isAuthenticated,
    isActive,
    isAdmin
} = require(path.join(__dirname, 'auth/rules'));


passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async function verify(req, email, password, cb) {
        const invalidMsg = { 
            text: 'Invalid Username or Password', 
            type: 'danger' 
        }
        const user = await prisma.user.findUnique({
            where: { email: email }
        })
        if (!user) {
            req.session.msg = invalidMsg
            return cb(null, false);
        }
        crypto.pbkdf2(
            password, 
            user.salt, 
            parseInt(process.env.ITERATIONS), 
            parseInt(process.env.KEY_LENGTH), 
            process.env.ENCRYPTION, 
            (err, hash) => {
                if (err) {
                    req.session.msg = {
                        text: 'Unknown Error Occured',
                        type: 'danger' 
                    }
                    return cb(err);
                }
                if (!crypto.timingSafeEqual(user.password, hash)) {
                    req.session.msg = invalidMsg
                    return cb(null, false);
                }
                return cb(null, user);
            }
        )
    }
));

passport.serializeUser((user, cb) => {
    process.nextTick(() => {
        return cb(null, {
            id: user.id,
            name: user.firstName,
            admin: user.admin,
            admin_view: false,
            active: user.active
        });
    });
});

passport.deserializeUser((user, cb) => {
    process.nextTick(() => {
        return cb(null, user);
    });
});


router.get('/login', (req, res) => {
    const msg = req.session.msg
    req.session.msg = ''
    res.render('auth/base', { 
        action: 'login', msg: msg 
    })
});


router.post('/login', (req, res) => {
    passport.authenticate('local', { 
        failureRedirect: '/login',
        successRedirect: req.session.reqURL || '/'
    })(req, res)
})


router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err)
            next(err);
        res.redirect('/login')
    });
});


router.get('/admin/toggle', (req, res, next) => {
    if (req.user.admin) {
        req.user.admin_view = !req.user.admin_view;
        res.status(200).send(`admin view: ${req.user.admin_view}`)
    }
    else {
        res.status(400)
        next()
    }
});


router.use('/', require(path.join(__dirname, 'auth/register')))
router.use('/', require(path.join(__dirname, 'auth/reset')))


module.exports = {
    router: router,
    passport: passport,
    isAuthenticated: isAuthenticated,
    isActive: isActive,
    isAdmin: isAdmin 
}
