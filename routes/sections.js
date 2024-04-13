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
}).single('course_image');



router.get('/', async (req, res) => {
    msg = req.session.msg;
    req.session.msg = '';
    res.render('course/home', {
        courses: await prisma.course.findMany({
            orderBy: { number: 'asc' }
        }),
        admin: req.user.admin,
        admin_view: req.user.admin_view,
        msg: msg
    });
})

router.get('/json', async (req, res) => {
    const courses = await prisma.course.findMany({
        include: { 
            lessons: { orderBy: { number: 'asc' } },
        },
        orderBy: { number: 'asc' }  
    })
    res.json(courses);
})


router.get('/:id', async (req, res, next) => {
    try {
        const course = await prisma.course.findUniqueOrThrow({
            where: { id: +req.params.id },
            include: { lessons: {
                orderBy: { number: 'asc' }
            }},
        });
        if (course.enableLessons)
            res.render(
                'course/lessons', { 
                    course: course, 
                    courses: await prisma.course.findMany({
                        where: { 
                            enableLessons: true,
                            NOT: { id: course.id }
                        },
                        orderBy: { name: 'desc' }
                    }),
                    admin: req.user.admin, 
                    admin_view: req.user.admin_view 
                }
            );
        else
            res.redirect(`/lessons/${course.lessons[0].id}`);
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
        course = await prisma.$transaction(async (tx) => {
            const query_res = await tx.course.aggregate({
                _max: { number: true }
            })
            let number = query_res._max.number + 1;
            if (!number)
                number = 0
            imageURL = `/media/${req.file.filename}`
            let data = {
                name: req.body.course_name,
                number: number,
                imageURL: imageURL,
                enableLessons: !!req.body.enable_lessons
            }
            if (!data.enableLessons) {
                let image_path = path.join(process.env.ROOT, 'public', imageURL)
                let diff = (Math.random() + 1).toString(36).substring(7);
                fs.copyFileSync(
                    image_path, 
                    image_path + diff, 
                    fs.constants.COPYFILE_EXCL
                );
                data.lessons = {
                    create: { 
                        name: req.body.course_name,
                        number: 1,
                        imageURL: imageURL + diff,
                        slides: {
                            create: { title: 'Slide 1', number: 1 }
                        }
                    }
                }
            }
            return await tx.course.create({ data: data })
        })
        res.render('course/card', { 
            course: course, 
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

async function checkLessonChange(req, res, course) {
    if (req.body.enable_lessons && !course.enableLessons) {
        return await prisma.course.update({
            where: { id: course.id },
            data: { enableLessons: true }
        })
    }

    if (!req.body.enable_lessons && course.enableLessons) {
        if (course.lessons.length == 1) {
            course = await prisma.course.update({
                where: { id: course.id },
                data: { enableLessons: false }
            })
        }
        else if (course.lessons.length == 0) {
            let image_path = path.join(process.env.ROOT, 'public', course.imageURL)
            let diff = (Math.random() + 1).toString(36).substring(7);
            fs.copyFileSync(
                image_path, 
                image_path + diff, 
                fs.constants.COPYFILE_EXCL
            );
            course = await prisma.course.update({
                where: { id: course.id },
                data: { 
                    enableLessons: false,
                    lessons: {
                        create: { 
                            name: course.name,
                            number: 1,
                            imageURL: course.imageURL + diff,
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
                'Unable to disable lessons\n' +
                'Can only disable lessons if there 0-1 lessons in a course'
            );
        }
    }
    return course;
}

router.put('/:id', upload_img, async (req, res) => {
    data = {}
    if (req.body.course_name)
        data.name = req.body.course_name;
    if (req.file) {
        data.imageURL = `/media/${req.file.filename}`;
        console.log(req.file)
    }
    
    try {
        let course;
        if (req.body.course_name || req.file.filename) {
            course = await prisma.course.update({
                where: { id: +req.params.id },
                data: data,
                include: { lessons : true}
            });
        }
        else
            course = await prisma.course.findUniqueOrThrow({
                where: { id: +req.params.id },
                include: { lessons: true }
            });
        course =  await checkLessonChange(req, res, course);
        res.render('course/card', { 
            course: course, 
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
        const course = await prisma.course.delete({
            where: { id: +req.params.id }
        })
        image_path = path.join(process.env.ROOT, 'public', course.imageURL)
        fs.unlink(image_path, err => { 
            if (err) throw err
        })
        res.status(200).send(`${course.name} deleted successfully.`)
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
                await tx.course.update({
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

