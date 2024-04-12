const express = require('express'),
      multer = require('multer'),
      { Prisma, PrismaClient } = require('@prisma/client');

const path = require('path'),
      fs = require('fs')

const router = express.Router()
const prisma = new PrismaClient()

const upload_img = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const des = path.join(
                process.env.ROOT, 'public/media'
            );
            cb(null, des);
        }
    }),
    fileFilter: (req, file, cb) => { 
        const ext = file.mimetype.split('/')[1];
        if (ext != 'png' && ext != 'jpeg')
            cb(null, false);
        else
            cb(null, true);
    } 
}).single('subsection_image');


router.get('/:id', async (req, res, next) => {
    const includes = { type: true };
    const componentTypes = await prisma.componentType.findMany()
    for (const componentType of componentTypes)
        includes[componentType.variable] = true
    try {
        const subsection = await prisma.subsection.findUniqueOrThrow({
            where: { id: +req.params.id },
            include: { 
                slides: {
                    orderBy: { number: 'asc' },
                    include: { components: {
                        orderBy: { number: 'asc' }, include: includes
                    } }
                },
                section: true
            },
        })
        const sections = await prisma.section.findMany({
            include: { 
                subsections: { orderBy: { number: 'asc' } },
            },
            orderBy: { number: 'asc' }
        })
        res.render(
            'subsection/subsection', { 
                subsection: subsection, 
                componentTypes: componentTypes,
                sections: sections,
                admin: req.user.admin, 
                admin_view: req.user.admin_view 
            }
        );
    }
    catch(err) {
        next(err)
    }
});


const { isAdmin } = require(
    path.join(process.env.ROOT, 'routes/auth')
)
router.use(isAdmin);


router.post('/', upload_img, async (req, res) => {
    try {
        const subsection = await prisma.$transaction(async (tx) => {
            const query_res = await tx.subsection.aggregate({
                _max: { number: true }
            })
            let number = query_res._max.number + 1;
            if (!number)
                number = 0
            const subsection = await tx.subsection.create({
                data: {
                    name: req.body.subsection_name,
                    number: number,
                    imageURL: `/media/${req.file.filename}`,
                    slides: {
                        create: { title: 'Slide 1', number: 1 }
                    },
                    section: {
                        connect: { id: +req.body.section_id }
                    }
                }
            })
            return subsection
        })
        res.render('subsection/card', { 
            subsection: subsection, 
            admin: req.user.admin,
            admin_view: req.user.admin_view 
        });
    }
    catch(e) {
        console.error(e)
        fs.unlink(req.file.path, error => {
            if (error)
                console.error(error)
        })
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2002'
        )
            res.status(400).send('Subsection Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.put('/:id', upload_img, async (req, res) => {
    data = {}
    if (req.body.subsection_name)
        data.name = req.body.subsection_name;
    if (req.file)
        data.imageURL = `/media/${req.file.filename}`;
    
    try {
        let subsection;
        if (req.body.subsection_name || req.file.filename)
            subsection = await prisma.subsection.update({
                where: { id: +req.params.id },
                data: data
            });
        else
            subsection = await prisma.subsection.findUniqueOrThrow({
                where: { id: +req.params.id }
            });
        
        if (subsection.sectionId != +req.body.section_id) {
            let section = await prisma.section.findUnique({
                where: { id: +req.body.section_id  }
            })
            if (!section.enableSubsections) {
                console.log(section)
                res.status(400).send(
                    'Subsections disabled for this section.'
                )
            }
            else {
                await prisma.subsection.update({
                    where: { id: subsection.id },
                    data: { sectionId: section.id }
                })
                res.status(202).json({ 
                    subsection_id: subsection.id,
                    subsection_name: subsection.name,
                    destination: section.name
                })
            }
        }
        else {
            res.render('subsection/card', { 
                subsection: subsection, admin: req.user.admin,
                admin_view: req.user.admin_view
            });
        }
    }
    catch(e) {
        console.error(e)
        if (req.file?.path)
            fs.unlink(req.file.path, error => {
                if (error) throw error
            });
        
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2002'
        )
            res.status(400).send('Subsection Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.delete('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        const subsection = await prisma.subsection.delete({
            where: { id: +req.params.id }
        })
        image_path = path.join(process.env.ROOT, 'public', subsection.imageURL)
        fs.unlink(image_path, err => { 
            if (err) throw err
        })
        res.status(200).send(`${subsection.name} deleted successfully.`)
    } 
    catch(e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Subsection Not Found')
        else if (e.syscall === 'unlink')
            res.status(400).send('Subsection Image Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.post('/reorder', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.$transaction(async (tx) => {
            for (const [index, id] of req.body.entries()) {
                await tx.subsection.update({
                    where: { id: +id },
                    data: { number: +index }
                }) 
            }
        });
        res.status(200).send('Reorder Success')
    }
    catch (e) {
        console.error(e)
        res.status(400).send('Reorder Fail')
    }
})



module.exports = router;
