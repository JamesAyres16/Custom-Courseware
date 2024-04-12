const express = require('express'),
      crypto = require('crypto'),
      path = require('path'),
      { PrismaClient, Prisma } = require('@prisma/client');
    
      
const { sendMail, buildEmail } = require(
    path.join(process.env.ROOT, 'helpers/mailer')
)
const { isAuthenticated } = require(path.join(__dirname, 'rules'))
          
const router = express.Router(),
prisma = new PrismaClient()


router.get('/signup', (req, res) => {
    const msg = req.session.msg;
    req.session.msg = '';
    res.render('auth/base', { action: 'signup', msg: msg })
});


router.post('/signup', async (req, res) => {
    console.log(req.body)
    if (req.body.password != req.body.passwordVerification) {
        req.session.msg = { 
            text: 'Passwords do not Match', type: 'danger'
        }
        res.redirect('/signup')
        return
    }
    const salt = crypto.randomBytes(16)
    crypto.pbkdf2(
        req.body.password, 
        salt, 
        parseInt(process.env.ITERATIONS), 
        parseInt(process.env.KEY_LENGTH), 
        process.env.ENCRYPTION, 
        async (err, hash) => {
            try {
                if (err)
                    throw err
                const user = await prisma.user.create({
                    data: {
                        email: req.body.email,
                        firstName: req.body.firstName,
                        lastName: req.body.lastName,
                        password: hash,
                        salt: salt
                    },
                    include: { verificationCode: true }
                });
                req.login(user, err => {
                    if (err) throw err;
                    res.redirect('/send-verification');
                })
            }
            catch (e) {
                console.error(e)
                req.session.msg = { type: 'danger' }
                if (
                    e instanceof Prisma.PrismaClientKnownRequestError &&
                    e.code == 'P2002'
                )
                    req.session.msg.text = 'Email Already in Use';
                else
                    req.session.msg.text = 'Failed to Create User';
                res.redirect('/signup')
            }
        }
    )
});


router.get('/send-verification', isAuthenticated, async (req, res) => {
    const code = crypto.randomBytes(5).toString('hex');
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                active: false,
                verificationCode: {
                    upsert: {
                        create: { code: code },
                        update: { code: code }
                    }
                }
            },
            include: { verificationCode: true }
        });
        
        const email_body = await buildEmail(req.app, user, 'verify-email')
        const subject = 'Email Verification for Custom Courseware';
        const mail_response = await sendMail(
            subject, email_body, 'html', user.email
        )
        console.log(mail_response)

        req.session.msg = {
            text: 'Email Sent',
            type: 'success'
        }
        res.redirect('/verify-email')
    }
    catch (e) {
        console.error(e)
        req.session.msg = { type: 'danger'}
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        ) {
            req.session.msg.text = 'User not Found'
            res.redirect('/signup')
        }
        else {
            req.session.msg.text = 'Failed to Send Email'
            res.redirect('/verify-email')
        }
    }
});


router.get('/verify-email', isAuthenticated, async (req, res) => {
    try {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: req.user.id }
        })
        if (user.active)
            res.redirect('/')
        else {
            const msg = req.session.msg;
            req.session.msg = '';
            res.render('auth/base', { action: 'verify-email', msg: msg });
        }
    } 
    catch (e) {
        console.error(e)
        req.logout(err => {
            if (err)
                throw err;
            res.redirect('/login')
        });
    }
});


router.post('/verify-email', isAuthenticated, async (req, res) => {
    try {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: req.user.id },
            include: { verificationCode: true }
        })
        const verification = user.verificationCode;
        if (user.active) {
            req.session.msg = {
                text: 'User already activated',
                type: 'warning'
            };
            res.redirect('/');
        }
        else if (
            !verification || req.body.code != verification.code || 
            new Date(verification.sendAt.getTime() + 30 * 60000) < new Date()
        ) {
            req.session.msg = {
                text: 'Invalid Verification Code',
                type: 'danger'
            }
            res.redirect('/verify-email');
        }
        else {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    active: true,
                    verificationCode: { 
                        delete: true
                    }
                }
            })
            req.user.active = true;
            req.session.msg = {
                text: 'Account Activated',
                type: 'success'
            }
            res.redirect('/');
        }
    }
    catch (e) {
        console.error(e)
        req.logout(err => {
            if (err)
                throw err;
            res.redirect('/login')
        });
    }
});

module.exports = router;
