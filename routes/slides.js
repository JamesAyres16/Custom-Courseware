const express = require('express'),
      { Prisma, PrismaClient } = require('@prisma/client'),
      path = require('path');

const router = express.Router()
const prisma = new PrismaClient()

const { isAdmin } = require(
    path.join(process.env.ROOT, 'routes/auth')
)
router.use(isAdmin)


async function app_render(app, view, data) {
    return new Promise((resolve, reject) => {
        app.render(view, data, (err, html) => { 
            if (err) 
                reject(err);
            else 
                resolve(html);
        });
    });
}
router.post('/', isAdmin, async (req,  res) => {
    try {
        const slide = await prisma.$transaction(async (tx) => {
            const query_res = await tx.slide.aggregate({
                where: { subsectionId: +req.body.subsectionId },
                _max: { number: true }
            })
            let number = query_res._max.number + 1;
            if (!number)
                number = 0
            return tx.slide.create({
                data: {
                    title: req.body.title,
                    number: number,
                    subsectionId: +req.body.subsectionId
                }
            })
        })
        res.set('Content-Type', 'application/json')
        res.json({
            'slide': await app_render(
                req.app, 'subsection/slide', { 
                    slide: slide,
                    admin: req.user.admin, 
                    admin_view: req.user.admin_view 
                }
            ),
            'mock': await app_render(
                req.app, 'subsection/slide_mock', { 
                    slide: slide,
                    admin: req.user.admin, 
                    admin_view: req.user.admin_view 
                }
            )
        })
    }
    catch(e) {
        console.error(e)
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2002'
        )
            res.status(400).send('Subsection Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
});


router.delete('/:id', isAdmin, async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        const slide = await prisma.slide.delete({
            where: { id: +req.params.id }
        })
        res.status(200).send(`${slide.name} deleted successfully.`)
    }
    catch (e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Slide Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})



router.put('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        res.status(200)
        let msg = '';
        let data = {}
        const slide = await prisma.slide.findUnique({
            where: { id: +req.params.id },
            include: { subsection: true }
        });
        if (req.body.title != slide.title) {
            msg += 'Slide name updated\n';
            data.title = req.body.title;
        }
        if (+req.body.subsection != slide.subsectionId) {
            const new_subsection = await prisma.subsection.findUnique({
                where: { id: +req.body.subsection },
                include: { section: true }
            });
            msg += (
                `Slide moved from ${slide.subsection.name}` +
                ` to ${new_subsection.section.name}/${new_subsection.name}`
            )
            data.subsectionId = new_subsection.id;
            res.status(202)
        }
        if (msg.length > 0) {
            await prisma.slide.update({
                where: { id: +req.params.id },
                data: data
            })
        }
        res.send(msg)
    } 
    catch (e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Slide Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
});



router.post('/reorder', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.$transaction(async (tx) => {
            for (const [index, id] of req.body.entries()) {
                await tx.slide.update({
                    where: { id: +id },
                    data: { number: +index}
                })
            }
        })
        res.status(200).send('Reorder Success')
    }
    catch (e) {
        console.log(e)
        res.status(400).send('Reorder Fail')
    }
})




module.exports = router;
