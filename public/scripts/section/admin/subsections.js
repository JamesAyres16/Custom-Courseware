
function delete_lesson_verification(event) {
    const card = event.relatedTarget.closest('.lesson-menu-card');
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted')
    thing_to_be_deleted.innerText = card.getElementsByClassName('lesson-title')[0].innerText;
    thing_to_be_deleted.dataset.src_id = card.id
    document.getElementById('delete-verified')
            .dataset
            .deleteVerifiedFunc = 'delete_lesson';
}

function delete_lesson(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/lessons/${thing_to_be_deleted.dataset.src_id}`, {
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


document.getElementById('lesson-modal')
        .addEventListener('show.bs.modal', event => {
    document.getElementById('lesson-image').value = '';
    const title = document.getElementById('lesson-modal-title');
    const name_field = document.getElementById('lesson-name');
    const submit = document.getElementById('submit-lesson');
    const method = event.relatedTarget.getAttribute('role');
    if (method == 'put') {
        title.innerText = 'Update Lesson';
        const card = event.relatedTarget.closest('.lesson-menu-card');
        name_field.value = card.getElementsByClassName('lesson-title')[0].innerText;
        document.getElementById('lesson-image').required = false;
        submit.setAttribute('data-origin-id', card.id);
    }
    else {
        title.innerText = 'New Lesson';
        name_field.value = '';
        document.getElementById('lesson-image').required = true;
        submit.setAttribute('data-origin-id', '');
    }
});

document.getElementById('lesson-form')
        .addEventListener('submit', event => {
        event.preventDefault();
        const origin_id = event.submitter.getAttribute('data-origin-id');
        const url = origin_id ? `/lessons/${origin_id}`: '/lessons/';
        const method = origin_id ? `PUT`: 'POST';
        const form = new FormData(
            document.getElementById('lesson-form')
        );
        fetch(url, {
            method: method,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: form
        }).then(async res => {
            if (!res.ok) {
                const hasMsg = (
                    res.headers.get('content-type')?.includes('text/plain')
                );
                const msg = hasMsg ? await res.text() : 'Non-Ok Response';
                throw new Error(msg)
            }
            else if (res.status == 202) {
                const data = await res.json();
                document.getElementById(`${data.lesson_id}`).remove();
                alert(
                    `${data.lesson_name} has been moved to ${data.destination}`, 
                    'success'
                );
            }
            else {
                const data = await res.text()
                const htmlRes = new DOMParser().parseFromString(data, 'text/html')
                const formatted_card = htmlRes.body.firstElementChild;
                if (origin_id) {
                    document.getElementById(origin_id).replaceWith(formatted_card);
                    alert('Lesson Successfully Updated','success');
                }
                else {
                    const spacer = document.getElementById('no-lesson-avalible');
                    if (spacer)
                        spacer.remove();
                    document.getElementById('lesson-column').appendChild(formatted_card);
                    alert('Lesson Successfully Created','success');
                }
            }
        }).catch(
            err => alert(err, 'danger')
        );
        document.getElementById('close-lesson-form').click()
    }
);


dragula(
    [ document.getElementById('lesson-column') ]
).on('drop', async (el, target, src, sibling) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ordered_names = Array.from(
        document.querySelectorAll('.lesson-menu-card:not(.gu-transit)')
    ).map(item => item.id)
    console.log(ordered_names)

    fetch('/lessons/reorder', {
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
});