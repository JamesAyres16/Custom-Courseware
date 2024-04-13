
function delete_course_verification(event) {
    const card = event.relatedTarget.closest('.course-menu-card');
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted')
    thing_to_be_deleted.innerText = card.getElementsByClassName('course-title')[0].innerText;
    thing_to_be_deleted.dataset.src_id = card.id
    document.getElementById('delete-verified')
            .dataset
            .deleteVerifiedFunc = 'delete_course';
}

function delete_course(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/courses/${thing_to_be_deleted.dataset.src_id}`, {
        method: 'DELETE',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    }).then(async res => {
        const msg = await res.text()
        if (!res.ok)
            throw Error(msg)
        document.getElementById(thing_to_be_deleted.dataset.src_id).remove();
        alert(msg, 'success');
    }).catch(
        err => alert(err, 'danger')
    );
    document.getElementById('close-verify-delete').click()
}


document.getElementById('course-modal')
        .addEventListener('show.bs.modal', event => {
    document.getElementById('course-image').value = '';
    const title = document.getElementById('course-modal-title');
    const name_field = document.getElementById('course-name');
    const submit = document.getElementById('submit-course');
    const method = event.relatedTarget.getAttribute('role');
    const lessonsCheckbox = document.getElementById('enable_lessons')
    if (method == 'put') {
        title.innerText = 'Update Course';
        const card = event.relatedTarget.closest('.course-menu-card');
        name_field.value = card.getElementsByClassName('course-title')[0].innerText;
        document.getElementById('course-image').required = false;
        submit.setAttribute('data-origin-id', card.id);
        lessonsCheckbox.checked = card.dataset.enableLessons == 'true';
    }
    else {
        title.innerText = 'New Course';
        name_field.value = '';
        document.getElementById('course-image').required = true;
        submit.setAttribute('data-origin-id', '');
        lessonsCheckbox.checked = true;
    }
});


document.getElementById('course-form')
        .addEventListener('submit', event => {
        event.preventDefault();
        const origin_id = event.submitter.getAttribute('data-origin-id');
        const url = origin_id ? `/courses/${origin_id}`: '/courses/';
        const method = origin_id ? `PUT`: 'POST';
        const form = new FormData(
            document.getElementById('course-form')
        );
        fetch(url, {
            method: method,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: form
        }).then(async res => {
            if (res.status != 412 && !res.ok) {
                const hasMsg = (
                    res.headers.get('content-type')?.includes('text/plain')
                );
                const msg = hasMsg ? await res.text() : 'Non-Ok Response';
                throw new Error(msg)
            }
            if (res.status == 412) {
                alert(
                    'Unable to disable lessons.\n' +
                    'Can only disable lessons if there 0-1 lessons in a course\n' +
                    'Please delete or move extra lessons',
                    'danger'
                )
            }
            const data = await res.text()
            const htmlRes = new DOMParser().parseFromString(data, 'text/html')
            const formatted_card = htmlRes.body.firstElementChild;
            if (origin_id) {
                document.getElementById(origin_id).replaceWith(formatted_card);
                alert('Course Successfully Updated','success');
            }
            else {
                const spacer = document.getElementById('no-course-avalible');
                if (spacer)
                    spacer.remove();
                document.getElementById('course-column').appendChild(formatted_card);
                alert('Course Successfully Created','success');
            }
        }).catch(
            err => alert(err, 'danger')
        );
        document.getElementById('close-course-form').click()
    }
);


dragula(
    [ document.getElementById('course-column') ]
).on('drop', async (el, target, src, sibling) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ordered_names = Array.from(
        document.querySelectorAll('.course-menu-card:not(.gu-transit)')
    ).map(item => item.id)

    fetch('/courses/reorder', {
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
        alert('Courses Reordered Successfully','success');
    }).catch(
        err => alert(err, 'danger')
    )
});
