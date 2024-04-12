const express = require('express'),
      { Prisma, PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();


function formatDefinition(str) {
    return str.split('\n').map(
        paragraph => `<p>${paragraph}</p>`
    ).join('')
}


async function renderTerm(req, term) {
    return new Promise((resolve, reject) => {
        req.app.render(
            'partials/glossary/term', {
                term: term,
                admin: req.user.admin, 
                admin_view: req.user.admin_view
            },
            (err, html) => { 
                if (err) 
                    reject(err);
                else 
                    resolve(html);
            }
        )
    });
}

router.get('/', async (req, res) => {
    res.contentType('application/json');
    const terms = await prisma.term.findMany({
        orderBy: { name: 'asc' }
    });
    const data = [];
    for (const term of terms) {
        data.push({
            name: term.name,
            html: await renderTerm(req, term)
        })
    }
    res.send(data);
})

router.post('/', async (req, res) => {
    try {
        const term = await prisma.term.create({
            data: {
                name: req.body.name.replace(/\s+/g, ' ').trim(),
                definition: formatDefinition(req.body.definition)
            }
        });
        res.render('partials/glossary/term', {
            term: term,
            admin: req.user.admin, 
            admin_view: req.user.admin_view
        })
    }
    catch (e) {
        console.error(e)
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2002'
        )
            res.status(400).send('Term Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.delete('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        const term = await prisma.term.delete({
            where: { id: +req.params.id }
        })
        res.status(200).send(`${term.name} deleted successfully.`)
    } 
    catch(e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Term Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.put('/:id', async (req, res) => {
    try {
        const term = await prisma.term.update({
            where: { id: +req.params.id },
            data: { 
                name: req.body.name.replace(/\s+/g, ' ').trim(),
                definition: formatDefinition(req.body.definition) 
            }
        });
        res.render('partials/glossary/term', {
            term: term,
            admin: req.user.admin,
            admin_view: req.user.admin_view 
        })
    }
    catch (e) {
        console.error(e)
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2002'
        )
            res.status(400).send('Term Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
});

module.exports = router;
