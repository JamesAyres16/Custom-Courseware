const express = require('express'),
      multer = require('multer'),
      { Prisma, PrismaClient } = require('@prisma/client');
      
const path = require('path'),
      fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

const { isAdmin } = require(
    path.join(process.env.ROOT, 'routes/auth')
);
router.use(isAdmin);

const upload_control = multer({ 
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
        if (ext != 'png' && ext != 'jpeg'  && ext != 'mp4')
            cb(null, false);
        else
            cb(null, true);
    }
}).fields([{name: 'component_video', maxCount: 999}, {name: 'component_image', maxCount: 999}]);


const components = new Map([
    [ 0, {
        id: 0,
        name: 'Spacer', 
        variable: 'spacer'
    }],
    [ 1, { 
        id: 1,
        name: 'Text Box', 
        variable: 'textbox'
    }],
    [ 2, {
        id: 2,
        name: 'Image',
        variable: 'image'
    }],
    [ 3, {
        id: 3,
        name: 'Video',
        variable: 'video'
    }],
    [ 4, {
        id: 4,
        name: 'Open-ended Question',
        variable: 'openEndedQuestion'
    }],
    [ 5, {
        id: 5,
        name: 'Reference',
        variable: 'reference'
    }],
    [ 6, {
        id: 6,
        name: 'Drag and Drop',
        variable: 'dragAndDrop'
    }],
    [ 7, {
        id: 7,
        name: 'Multiple Choice Question',
        variable: 'multipleChoiceQuestion'
    }]
])

prisma.componentType.createMany({
    data: [...components.values()],
    skipDuplicates: true
}).then(() => console.log('Component Types Uploaded'));


class InvalidTypeId extends Error {
    constructor(message, options) {
        super(message, options);
    }
}


function getQueryIncludes() {
    // builds json include statement for all possible component types
    const include = [...components.values()].reduce((accumulator, component) => {
        accumulator[component.variable] = true
        return accumulator
    }, { type: true })
    return include;
}

function getFieldDict(req) {
    // takes request that contains json will slide id and
    // component information and generates a prisma object 
    // that handles object creation or update. 
    //
    // NOTE: Probabliy will refactor after multiple components
    // 
    const componentTypeId = +req.body.componentTypeId;
    const data = {
        width: +req.body.width,
        height: +req.body.height || null
    };
    if (req.method == 'POST') {
        data.slide = {
            connect: { id: +req.body.slide }
        }
        data.type = {
            connect: { id: componentTypeId }
        }
    }
    switch (componentTypeId) {
        case 0:
            data.spacer = {};
            break;
        case 1:
            var input = { data: req.body.data };
            if (req.method == 'POST')
                data.textbox = { create: input };
            else
                data.textbox = { update: input };
            break;
        case 2:
            if (req.method == 'POST') {
                let url = `/media/${req.files?.component_image[0].filename || 'required/video_not_found.jpg'}`
                data.image = { create: { URL: url } };
            }
            else {
                if (req.file)
                    data.image = { 
                        update: { URL: `/media/${req.file.filename}` }
                    };
            }
            break;
        case 3:
            if (req.method == 'POST'){
                let url = `/media/${req.files?.component_video[0].filename || 'required/image_not_found.png'}`
                data.video = {create: { URL: url } };
            }
            else {
                if (req.file)
                    data.video = {
                        update: { URL:`/media/${req.file.filename}` }
                    };
            }
            break;
        case 4:
            var input = { 
                prompt: req.body.data,
                responseHeight: +req.body.responseHeight
            };
            if (req.method == 'POST')
                data.openEndedQuestion = { create: input };
            else
                data.openEndedQuestion = { update: input };
            break; 
        case 5:
            var input = { 
                sectionId: +req.body.sectionId,
                message: req.body.message
            };
            if (req.body.subsectionId) {
                input.subsectionId = +req.body.subsectionId;
            }
            if (req.method == 'POST')
                data.reference = { create: input };
            else
                data.reference = { update: input };
            break;  
        case 6:
            var input = { 
                questions: req.body.questions,
                answers: req.body.answers,
                header: req.body.header ? req.body.header : ''
            };
            if (req.method == 'POST')
                data.dragAndDrop = { create: input };
            else
                data.dragAndDrop = { update: input };
            break;
        case 7:
            console.log(req.body)
            var input = { 
                question: req.body.question,
                options: req.body.options,
                correctIndex: +req.body.correctIndex
            };
            if (req.method == 'POST')
                data.multipleChoiceQuestion = { create: input };
            else
                data.multipleChoiceQuestion = { update: input };
            break;  
        default:
            throw new InvalidTypeId(
                `Error: Unknown Type Id: ${componentTypeId}`
            );
    }
    return data;
}


router.post('/', upload_control, async (req, res) => {
    try {
        const createObj = { 
            data: getFieldDict(req),
            include: getQueryIncludes()
        }
        const component = await prisma.$transaction(async tx => {
            const query_res = await tx.component.aggregate({
                _max: { number: true },
                where: { slide: {
                    id: +req.body.slide
                    }
                }
            });
            let number = query_res._max.number + 1;
            if (!number)
                number = 0;
            createObj.data.number = number;
            return await tx.component.create(createObj);
        })
        res.render(`subsection/component/base`, { 
            component: component, admin: req.user.admin, 
            admin_view: req.user.admin_view 
        });
    }
    catch (e) {
        console.error(e);
        res.set('Content-Type', 'text/plain')
        if (e instanceof InvalidTypeId)
            res.status(400).send('Error: Invalid Type Id.')
        else
            res.status(500).send('Failed to create Component.')
    }
});


router.put('/:id', upload_control, async (req, res) => {
    try {
        const component = await prisma.component.update({
            where: { id: +req.params.id },
            data: getFieldDict(req),
            include: getQueryIncludes()
        })
        res.render(
            `subsection/component/base`, { 
                component: component, admin: req.user.admin, 
                admin_view: req.user.admin_view  
            }
        )
    }
    catch (e) {
        console.error(e)
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2025'
        )
            res.status(400).send('Component Not Found')
        else if(e instanceof InvalidTypeId)
            res.status(400).send('Error: Invalid Type Id.')
        else
            res.status(500).send(
                'Unknown Error Occurred. Unable to Update Component.'
            )
    }
})



router.get('/form/:id', async (req, res) => {
    try {
        const component = await prisma.component.findUniqueOrThrow({
            where: { id: +req.params.id },
            include: getQueryIncludes()
        })
        res.render(
            `subsection/component_form/base`,
            { component: component }
        );
    }
    catch (e) {
        console.error(e)
        res.set('Content-Type', 'text/plain')
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2025'
        )
            res.status(400).send('Component Not Found')
        else if(e instanceof InvalidTypeId)
            res.status(400).send('Error: Invalid Type Id.')
        else
            res.status(500).send(
                'Unknown Error Occurred. Unable to Open Component Form.'
            )
    }
})


router.delete('/:id', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.component.delete({
            where: { id: +req.params.id }
        })
        res.status(200).send('Component deleted successfully.')
    } 
    catch(e) {
        console.error(e)
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code == 'P2015'
        )
            res.status(400).send('Component Not Found')
        else
            res.status(500).send('Unknown Error Occurred')
    }
})


router.post('/reorder', async (req, res) => {
    res.set('Content-Type', 'text/plain')
    try {
        await prisma.$transaction(async (tx) => {
            for (const [index, id] of req.body.entries()) {
                console.log(`${index} ${id}`);
                await tx.component.update({
                    where: { id: +id },
                    data: { number: +index }
                }) 
            }
        });
        res.status(200).send('Reorder Success')
    }
    catch (e) {
        console.error(e)
        res.status(500).send('Reorder Fail')
    }
})

module.exports = router;