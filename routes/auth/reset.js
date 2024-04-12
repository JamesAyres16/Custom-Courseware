const express = require('express'),
      crypto = require('crypto'),
      path = require('path'),
      { PrismaClient, Prisma } = require('@prisma/client');

const { sendMail, buildEmail } = require(
    path.join(process.env.ROOT, 'helpers/mailer')
)

const router = express.Router(),
      prisma = new PrismaClient()


router.get('/reset-password/:code', async (req, res) => {
    const msg = req.session.msg;
    req.session.msg = ''

    const verification = await prisma.verification.findUnique({
        where: { code: req.params.code }
    })
    if (
        !verification ||
        new Date(verification.sendAt.getTime() + 30 * 60000) < new Date()
    ) {
        req.session.msg = {
            text: 'Invalid Code', type: 'danger'
        }
        res.redirect('/login')
    }
    else
        res.render('auth/base', {
            action: 'reset-password',
            code: verification.code,
            msg: msg
        })
})


router.post('/reset-password/:code', async (req, res) => {
    console.log(req.body.password)
    console.log(req.body.passwordVerification)
    if (req.body.password != req.body.passwordVerification) {
        req.session.msg = { 
            text: 'Passwords do not Match', type: 'danger'
        }
        res.redirect(`/reset-password/${req.params.code}`)
        return
    }
    const verification = await prisma.verification.findUnique({
        where: { code: req.params.code },
        include: { user: true }
    })
    if (
        !verification ||
        new Date(verification.sendAt.getTime() + 30 * 60000) < new Date()
    ) {
        req.session.msg = {
            text: 'Invalid Code', type: 'danger'
        }
        res.redirect('/login')
    }
    else {
        crypto.pbkdf2(
            req.body.password, 
            verification.user.salt, 
            parseInt(process.env.ITERATIONS), 
            parseInt(process.env.KEY_LENGTH), 
            process.env.ENCRYPTION, 
            async (err, hash) => {
                try {
                    if (err)
                        throw err;
                    const user = await prisma.user.update({
                        where: { id: verification.user.id },
                        data: {
                            password: hash,
                            verificationCode: { 
                                delete: true
                            }
                        }
                    })
                    req.login(user, err => {
                        if (err) {
                            req.session.msg = {
                                text: 'Please Login to Continue',
                                type: 'warn'
                            }
                            res.redirect('/login')
                        }
                        else {
                            req.session.msg = {
                                text: 'Password Reset Success',
                                type: 'success'
                            }
                            res.redirect('/')
                        }
                    })
                }
                catch (err) {
                    console.error(err)
                    req.session.msg = { type: 'danger'}
                    if (
                        e instanceof Prisma.PrismaClientKnownRequestError &&
                        e.code == 'P2015'
                    )
                        req.session.msg.text = 'User not Found'
                    else
                        req.session.msg.text = 'Failed to Update Password'
                    res.redirect('/login')
                }
            }
        )    
    }
})


router.post('/reset-password', async (req, res) => {
    res.contentType('text/plain')
    try {
        const code = crypto.randomBytes(16).toString('hex');
        const user = await prisma.user.update({
            where: { email: req.body.email },
            data: {
                verificationCode: {
                    upsert: {
                        create: { code: code },
                        update: { code: code }
                    }
                }
            }
        });
        const email_body = await buildEmail(
            req.app, user, 'reset-password', 
            { code: code}
        )
        const subject = 'Password Reset for Custom Courseware';
        await sendMail(
            subject, email_body, 'html', user.email
        )
        res.send('Password Reset Email has been sent')
    }
    catch (e) {
        console.error(e);
        res.status(400)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.send('Failed to Find User')
        else
            res.send('Failed to Send Email')
    }
})


module.exports = router;
