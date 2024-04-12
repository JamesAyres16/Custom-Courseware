
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        console.log(`${req.user.name} is signed in...`)
        return next();
    }
    if (req.xhr) {
        res.set('Content-Type', 'text/plain')
        res.status(400).send(
            'You must be signed in to preform this action.'
        )
    }
    else {
        req.session.msg = {
            text: 'You need to be logged in to view this content.',
            type: 'warning'
        }
        req.session.reqURL = req.url;
        res.redirect('/login');
    }
}

function isActive(req, res, next) {
    if (req.user.active)
        return next();
    req.session.msg = {
        text: 'Your account is marked as inactive.' + 
              'You must verify your email to continue.',
        type: 'warning'
    }
    res.redirect('/verify-email');
}

function isAdmin(req, res, next) {
    if (req.user.admin)
        return next();
    req.session.msg = {
        text: 'You must be admin to preform this action.' + 
              'You must sign-in to an admin account to continue',
        type: 'warning'
    }
    res.redirect('/login');
}

module.exports =  {
    isAuthenticated: isAuthenticated,
    isActive: isActive,
    isAdmin: isAdmin
};