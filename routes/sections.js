const e = require('express');
const express = require('express'),
      multer = require('multer'),
      { Prisma, PrismaClient } = require('@prisma/client');

const path = require('path'),
      fs = require('fs');

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
}).single('section_image');



router.get('/', async (req, res) => {
    msg = req.session.msg;
    req.session.msg = '';
    res.render('section/home', {
        sections: await prisma.section.findMany({
            orderBy: { number: 'asc' }
        }),
        admin: req.user.admin,
        admin_view: req.user.admin_view,
        msg: msg
    });
})

router.get('/json', async (req, res) => {
    const sections = await prisma.section.findMany({
        include: { 
            subsections: { orderBy: { number: 'asc' } },
        },
        orderBy: { number: 'asc' }  
    })
    res.json(sections);
})


router.get('/:id', async (req, res, next) => {
    try {
        const section = await prisma.section.findUniqueOrThrow({
            where: { id: +req.params.id },
            include: { subsections: {
                orderBy: { number: 'asc' }
            }},
        });
        if (section.enableSubsections)
            res.render(
                'section/subsections', { 
                    section: section, 
                    sections: await prisma.section.findMany({
                        where: { 
                            enableSubsections: true,
                            NOT: { id: section.id }
                        },
                        orderBy: { name: 'desc' }
                    }),
                    admin: req.user.admin, 
                    admin_view: req.user.admin_view 
                }
            );
        else
            res.redirect(`/subsections/${section.subsections[0].id}`);
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
        section = await prisma.$transaction(async (tx) => {
            const query_res = await tx.section.aggregate({
                _max: { number: true }
            })
            let number = query_res._max.number + 1;
            if (!number)
                number = 0
            imageURL = `/media/${req.file.filename}`
            let data = {
                name: req.body.section_name,
                number: number,
                imageURL: imageURL,
                enableSubsections: !!req.body.enable_subsections
            }
            if (!data.enableSubsections) {
                let image_path = path.join(process.env.ROOT, 'public', imageURL)
                let diff = (Math.random() + 1).toString(36).substring(7);
                fs.copyFileSync(
                    image_path, 
                    image_path + diff, 
                    fs.constants.COPYFILE_EXCL
                );
                data.subsections = {
                    create: { 
                        name: req.body.section_name,
                        number: 1,
                        imageURL: imageURL + diff,
                        slides: {
                            create: { title: 'Slide 1', number: 1 }
                        }
                    }
                }
            }
            return await tx.section.create({ data: data })
        })
        res.render('section/card', { 
            section: section, 
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
            res.status(400).send('Section Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})

async function checkSubsectionChange(req, res, section) {
    if (req.body.enable_subsections && !section.enableSubsections) {
        return await prisma.section.update({
            where: { id: section.id },
            data: { enableSubsections: true }
        })
    }

    if (!req.body.enable_subsections && section.enableSubsections) {
        if (section.subsections.length == 1) {
            section = await prisma.section.update({
                where: { id: section.id },
                data: { enableSubsections: false }
            })
        }
        else if (section.subsections.length == 0) {
            let image_path = path.join(process.env.ROOT, 'public', section.imageURL)
            let diff = (Math.random() + 1).toString(36).substring(7);
            fs.copyFileSync(
                image_path, 
                image_path + diff, 
                fs.constants.COPYFILE_EXCL
            );
            section = await prisma.section.update({
                where: { id: section.id },
                data: { 
                    enableSubsections: false,
                    subsections: {
                        create: { 
                            name: section.name,
                            number: 1,
                            imageURL: section.imageURL + diff,
                            slides: {
                                create: { title: 'Slide 1', number: 1 }
                            }
                        }
                    }
                }
            })
        }
        else {
            res.status(412).send(
                'Unable to disable subsections\n' +
                'Can only disable subsections if there 0-1 subsections in a section'
            );
        }
    }
    return section;
}

router.put('/:id', upload_img, async (req, res) => {
    data = {}
    if (req.body.section_name)
        data.name = req.body.section_name;
    if (req.file) {
        data.imageURL = `/media/${req.file.filename}`;
        console.log(req.file)
    }
    
    try {
        let section;
        if (req.body.section_name || req.file.filename) {
            section = await prisma.section.update({
                where: { id: +req.params.id },
                data: data,
                include: { subsections : true}
            });
        }
        else
            section = await prisma.section.findUniqueOrThrow({
                where: { id: +req.params.id },
                include: { subsections: true }
            });
        section =  await checkSubsectionChange(req, res, section);
        res.render('section/card', { 
            section: section, 
            admin: req.user.admin,
            admin_view: req.user.admin_view
        });
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
            res.status(400).send('Section Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.delete('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        const section = await prisma.section.delete({
            where: { id: +req.params.id }
        })
        image_path = path.join(process.env.ROOT, 'public', section.imageURL)
        fs.unlink(image_path, err => { 
            if (err) throw err
        })
        res.status(200).send(`${section.name} deleted successfully.`)
    } 
    catch(e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Section Not Found')
        else if (e.syscall === 'unlink')
            res.status(400).send('Section Image Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.post('/reorder', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.$transaction(async (tx) => {
            for (const [index, id] of req.body.entries()) {
                await tx.section.update({
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

