const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_KEY});


async function sendMail(subject, body, contentType, emailAddress) {
    options = {
        from: "Custom Courseware <mailbot@custom-courseware.org>",
        to: [ emailAddress ],
        subject: subject
    }
    if (contentType == 'html')
        options.html = body;
    else
        options.text = body;

    return mg.messages.create(process.env.MAILGUN_DOMAIN, options)
    // .then(
    //     msg => console.log(msg)
    // ).catch(
    //     err => console.log(err)
    // );
}

async function buildEmail(app, user, template, options) {
    return new Promise((resolve, reject) => {
        app.render(
            `email/${template}`, { user: user, ...options }, 
            (err, html) => { 
                if (err) 
                    reject(err);
                else 
                    resolve(html);
            }
        );
    });
}


module.exports = {
    sendMail: sendMail,
    buildEmail: buildEmail
};
