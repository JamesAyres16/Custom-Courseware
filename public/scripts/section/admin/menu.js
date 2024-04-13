
function delete_section_verification(event) {
    const card = event.relatedTarget.closest('.section-course-card');
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted')
    thing_to_be_deleted.innerText = card.getElementsByClassName('section-title')[0].innerText;
    thing_to_be_deleted.dataset.src_id = card.id
    document.getElementById('delete-verified')
            .dataset
            .deleteVerifiedFunc = 'delete_section';
}

function delete_section(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/sections/${thing_to_be_deleted.dataset.src_id}`, {
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


document.getElementById('section-modal')
        .addEventListener('show.bs.modal', event => {
    document.getElementById('section-image').value = '';
    const title = document.getElementById('section-modal-title');
    const name_field = document.getElementById('section-name');
    const submit = document.getElementById('submit-section');
    const method = event.relatedTarget.getAttribute('role');
    const subsectionsCheckbox = document.getElementById('enable_subsections')
    if (method == 'put') {
        title.innerText = 'Update Section';
        const card = event.relatedTarget.closest('.section-course-card');
        name_field.value = card.getElementsByClassName('section-title')[0].innerText;
        document.getElementById('section-image').required = false;
        submit.setAttribute('data-origin-id', card.id);
        subsectionsCheckbox.checked = card.dataset.enableSubsections == 'true';
    }
    else {
        title.innerText = 'New Section';
        name_field.value = '';
        document.getElementById('section-image').required = true;
        submit.setAttribute('data-origin-id', '');
        subsectionsCheckbox.checked = true;
    }
});


document.getElementById('section-form')
        .addEventListener('submit', event => {
        event.preventDefault();
        const origin_id = event.submitter.getAttribute('data-origin-id');
        const url = origin_id ? `/sections/${origin_id}`: '/sections/';
        const method = origin_id ? `PUT`: 'POST';
        const form = new FormData(
            document.getElementById('section-form')
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
                    'Unable to disable subsections.\n' +
                    'Can only disable subsections if there 0-1 subsections in a section\n' +
                    'Please delete or move extra subsections',
                    'danger'
                )
            }
            const data = await res.text()
            const htmlRes = new DOMParser().parseFromString(data, 'text/html')
            const formatted_card = htmlRes.body.firstElementChild;
            if (origin_id) {
                document.getElementById(origin_id).replaceWith(formatted_card);
                alert('Section Successfully Updated','success');
            }
            else {
                const spacer = document.getElementById('no-section-avalible');
                if (spacer)
                    spacer.remove();
                document.getElementById('section-column').appendChild(formatted_card);
                alert('Section Successfully Created','success');
            }
        }).catch(
            err => alert(err, 'danger')
        );
        document.getElementById('close-section-form').click()
    }
);


dragula(
    [ document.getElementById('section-column') ]
).on('drop', async (el, target, src, sibling) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ordered_names = Array.from(
        document.querySelectorAll('.section-course-card:not(.gu-transit)')
    ).map(item => item.id)

    fetch('/sections/reorder', {
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
        alert('Sections Reordered Successfully','success');
    }).catch(
        err => alert(err, 'danger')
    )
});
