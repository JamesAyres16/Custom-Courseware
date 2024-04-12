
function delete_slide_verification(event) {
    const container = event.relatedTarget.closest('[data-slide-id]');
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    thing_to_be_deleted.innerText = container.dataset.slideTitle;
    thing_to_be_deleted.dataset.slideId = container.dataset.slideId;
    document.getElementById('delete-verified').dataset.deleteVerifiedFunc = 'delete_slide';
}

function remove_slide(slide_id) {
    const slide = document.querySelector(
        `.carousel-item[data-slide-id='${slide_id}']`
    )
    const slides = [...slide.parentElement.children]
    if (slide.classList.contains('active') && slides.length > 1) {
        const next = (slides.indexOf(slide) + 1) % slides.length
        slide.classList.remove('active')
        slides[next].classList.add('active')
        const nextMock = document.querySelector(
            `.mock[data-slide-id="${slides[next].dataset.slideId}"`
        )
        nextMock.firstElementChild.style.color = 'white';
        nextMock.firstElementChild.classList.remove('bg-opacity-10');
    }
    const q_str = `[data-slide-id='${slide_id}']:not(#thing-to-be-deleted)`
    for (const el of document.querySelectorAll(q_str))
        el.remove();
    if (document.getElementsByClassName('carousel-item').length == 0) 
        addSlide('Slide 1');
}

function delete_slide(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/slides/${thing_to_be_deleted.dataset.slideId}`, {
        method: 'DELETE',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    }).then(async res => {
        if (!res.ok) {
            const hasMsg = (
                res.headers.get('content-type')?.includes('text/plain')
            );
            const msg = hasMsg ? await res.text() : 'Non-Ok Response';
            throw new Error(msg)
        }
        remove_slide(thing_to_be_deleted.dataset.slideId)
        alert('Slide Removed', 'success')
    }).catch(
        err => alert(err, 'danger')
    )
    document.getElementById('close-verify-delete').click()
}


function addSlide(title) {
    const subsectionId = document.getElementById('subsection_container').dataset.subsectionId
    fetch(`/slides`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({title: title, subsectionId: subsectionId})
    }).then(async res => {
        if (!res.ok) {
            const hasMsg = (
                res.headers.get('content-type')?.includes('text/plain')
            );
            const msg = hasMsg ? await res.text() : 'Non-Ok Response';
            throw new Error(msg)
        }
        const { mock, slide } = await res.json();

        const slide_container = document.getElementById('slide-container');
        slide_container.insertAdjacentHTML('beforeend', slide);
        addComponentReordering(slide_container.lastChild);
        if (slide_container.childElementCount == 1)
            slide_container.lastChild.classList.add('active');

        const slide_panel = document.getElementById('panel-slide-container');
        slide_panel.insertAdjacentHTML('beforeend', mock);
        slide_panel.lastElementChild.addEventListener(
            'click', event => jumpToSlide(event.target.closest('.mock'))
        )
        alert('Slide Added', 'success')
    }).catch(
        err => alert(err, 'danger')
    )
}

document.getElementById('add-slide-btn').addEventListener('click', (event) => {
    const slide_title_box = document.getElementById('new-slide-name');
    const title = slide_title_box.value;
    if (!title)
        return;
    slide_title_box.value = '';
    addSlide(title);
})



document.getElementById('modifySlideModal').addEventListener('show.bs.modal', event => {
    let carousel_item = event.relatedTarget.closest('.carousel-item')
    event.target.dataset.slideId = carousel_item.dataset.slideId;
    let slide_title = carousel_item.querySelector('.slide-title').innerText;
    document.getElementById('newSlideName').value = slide_title;
    let section_dropdown = document.getElementById('section_id')
    section_dropdown.value = section_dropdown.firstElementChild.value;
})

var section_mapping;
fetch('/sections/json', {
    method: 'GET',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
    }
}).then(async res => {
    if (!res.ok) {
        const hasMsg = (
            res.headers.get('content-type')?.includes('text/plain')
        );
        const msg = hasMsg ? await res.text() : 'Non-Ok Response';
        throw new Error(msg)
    }
    section_mapping = (await res.json()).filter(
        section => section.subsections.length
    );
}).catch(
    err => console.log(err)
);

document.getElementById("section_id").addEventListener('change', event => {
    let section_dropdown = document.getElementById("section_id");
    let section = section_mapping.find(
        section => section.id == +section_dropdown.value
    )
    let subsection_dropdown = document.getElementById("subsection_id");
    subsection_dropdown.innerHTML = ''
    section.subsections.forEach(subsection => {
        let option = document.createElement('option');
        option.value = subsection.id;
        option.innerText = subsection.name;
        subsection_dropdown.appendChild(option)
    })
});


document.getElementById('modifySlide').addEventListener('click', event => {
    const newSlideName = document.getElementById('newSlideName');
    if (newSlideName.value === '') {
        alert("Slide Name can't be blank")
        return
    }
    const modal = event.target.closest('.modal');
    fetch(`/slides/${modal.dataset.slideId}`, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            title: newSlideName.value,
            subsection: +document.getElementById('subsection_id').value
        })
    }).then(async res => {
        if (!res.ok) {
            const hasMsg = (
                res.headers.get('content-type')?.includes('text/plain')
            );
            const msg = hasMsg ? await res.text() : 'Non-Ok Response';
            throw new Error(msg)
        }
        else if (res.status == 202) {
            remove_slide(modal.dataset.slideId) 
            const msg = await res.text();
            alert(msg, 'success')
        }
        else {
            console.log(await res.text())
            const mockTitle = document.querySelector(
                `div.mock[data-slide-id="${modal.dataset.slideId}"] .title`
            )
            mockTitle.innerText = newSlideName.value;
            mockTitle.closest('.mock').dataset.slideTitle = newSlideName.value;
            const slideTitle = document.querySelector(
                `div.carousel-item[data-slide-id="${modal.dataset.slideId}"] .title`
            )
            slideTitle.innerText = newSlideName.value;
            alert('Slide Renamed', 'success')
        }
    }).catch(
        err => alert(err, 'danger')
    )
    modal.querySelector('button[data-bs-dismiss]').click();
})

Array.from(document.querySelectorAll('.carousel-item'))
     .forEach(slide => addComponentReordering(slide));

function addComponentReordering(slide) {
    const row = slide.getElementsByClassName('row')[0];
    dragula(
        [ row ]
    ).on('drop', async (el, target, src, sibling) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const ordered_names = Array.from(
            row.querySelectorAll('.row > div:not(.gu-transit)')
        ).map(div => div.dataset.componentId)
        
        fetch('/components/reorder', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ordered_names)
        }).then(async res => {
            if (!res.ok) {
                const hasMsg = (
                    res.headers.get('content-type')?.includes('text/plain')
                );
                const msg = hasMsg ? await res.text() : 'Non-Ok Response';
                throw new Error(msg)
            }
            alert('Lessons Reordered Successfully','success');
        }).catch(
            err => alert(err, 'danger')
        )
    })
}

dragula(
    [ document.getElementById('panel-slide-container') ]
).on('drop', async (el, target, src, sibling) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ordered_names = Array.from(
        document.querySelectorAll('.mock:not(.gu-transit)')
    ).map(item => item.dataset.slideId)

    fetch('/slides/reorder', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ordered_names)
    }).then(async res => {
        if (!res.ok) {
            const hasMsg = (
                res.headers.get('content-type')?.includes('text/plain')
            );
            const msg = hasMsg ? await res.text() : 'Non-Ok Response';
            throw new Error(msg)
        }
        const slide_container = document.getElementById('slide-container')
        for (const id of ordered_names) {
            slide_container.appendChild(
                slide_container.querySelector(`.carousel-item[data-slide-id='${id}']`)
            )
        }
        alert('Lessons Reordered Successfully','success');
    }).catch(
        err => alert(err, 'danger')
    )
});
