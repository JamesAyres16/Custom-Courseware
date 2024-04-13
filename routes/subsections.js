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
}).single('lesson_image');


router.get('/:id', async (req, res, next) => {
    const includes = { type: true };
    const componentTypes = await prisma.componentType.findMany()
    for (const componentType of componentTypes)
        includes[componentType.variable] = true
    try {
        const lesson = await prisma.lesson.findUniqueOrThrow({
            where: { id: +req.params.id },
            include: { 
                slides: {
                    orderBy: { number: 'asc' },
                    include: { components: {
                        orderBy: { number: 'asc' }, include: includes
                    } }
                },
                course: true
            },
        })
        const courses = await prisma.course.findMany({
            include: { 
                lessons: { orderBy: { number: 'asc' } },
            },
            orderBy: { number: 'asc' }
        })
        res.render(
            'lesson/lesson', { 
                lesson: lesson, 
                componentTypes: componentTypes,
                courses: courses,
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
        const lesson = await prisma.$transaction(async (tx) => {
            const query_res = await tx.lesson.aggregate({
                _max: { number: true }
            })
            let number = query_res._max.number + 1;
            if (!number)
                number = 0
            const lesson = await tx.lesson.create({
                data: {
                    name: req.body.lesson_name,
                    number: number,
                    imageURL: `/media/${req.file.filename}`,
                    slides: {
                        create: { title: 'Slide 1', number: 1 }
                    },
                    course: {
                        connect: { id: +req.body.course_id }
                    }
                }
            })
            return lesson
        })
        res.render('lesson/card', { 
            lesson: lesson, 
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
            res.status(400).send('Lesson Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.put('/:id', upload_img, async (req, res) => {
    data = {}
    if (req.body.lesson_name)
        data.name = req.body.lesson_name;
    if (req.file)
        data.imageURL = `/media/${req.file.filename}`;
    
    try {
        let lesson;
        if (req.body.lesson_name || req.file.filename)
            lesson = await prisma.lesson.update({
                where: { id: +req.params.id },
                data: data
            });
        else
            lesson = await prisma.lesson.findUniqueOrThrow({
                where: { id: +req.params.id }
            });
        
        if (lesson.courseId != +req.body.course_id) {
            let course = await prisma.course.findUnique({
                where: { id: +req.body.course_id  }
            })
            if (!course.enableLessons) {
                console.log(course)
                res.status(400).send(
                    'Lessons disabled for this course.'
                )
            }
            else {
                await prisma.lesson.update({
                    where: { id: lesson.id },
                    data: { courseId: course.id }
                })
                res.status(202).json({ 
                    lesson_id: lesson.id,
                    lesson_name: lesson.name,
                    destination: course.name
                })
            }
        }
        else {
            res.render('lesson/card', { 
                lesson: lesson, admin: req.user.admin,
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
            res.status(400).send('Lesson Name Taken')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.delete('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        const lesson = await prisma.lesson.delete({
            where: { id: +req.params.id }
        })
        image_path = path.join(process.env.ROOT, 'public', lesson.imageURL)
        fs.unlink(image_path, err => { 
            if (err) throw err
        })
        res.status(200).send(`${lesson.name} deleted successfully.`)
    } 
    catch(e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Lesson Not Found')
        else if (e.syscall === 'unlink')
            res.status(400).send('Lesson Image Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.post('/reorder', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.$transaction(async (tx) => {
            for (const [index, id] of req.body.entries()) {
                await tx.lesson.update({
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
