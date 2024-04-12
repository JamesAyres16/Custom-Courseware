
function delete_subsection_verification(event) {
    const card = event.relatedTarget.closest('.subsection-menu-card');
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted')
    thing_to_be_deleted.innerText = card.getElementsByClassName('subsection-title')[0].innerText;
    thing_to_be_deleted.dataset.src_id = card.id
    document.getElementById('delete-verified')
            .dataset
            .deleteVerifiedFunc = 'delete_subsection';
}

function delete_subsection(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/subsections/${thing_to_be_deleted.dataset.src_id}`, {
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


document.getElementById('subsection-modal')
        .addEventListener('show.bs.modal', event => {
    document.getElementById('subsection-image').value = '';
    const title = document.getElementById('subsection-modal-title');
    const name_field = document.getElementById('subsection-name');
    const submit = document.getElementById('submit-subsection');
    const method = event.relatedTarget.getAttribute('role');
    if (method == 'put') {
        title.innerText = 'Update Lesson';
        const card = event.relatedTarget.closest('.subsection-menu-card');
        name_field.value = card.getElementsByClassName('subsection-title')[0].innerText;
        document.getElementById('subsection-image').required = false;
        submit.setAttribute('data-origin-id', card.id);
    }
    else {
        title.innerText = 'New Lesson';
        name_field.value = '';
        document.getElementById('subsection-image').required = true;
        submit.setAttribute('data-origin-id', '');
    }
});

document.getElementById('subsection-form')
        .addEventListener('submit', event => {
        event.preventDefault();
        const origin_id = event.submitter.getAttribute('data-origin-id');
        const url = origin_id ? `/subsections/${origin_id}`: '/subsections/';
        const method = origin_id ? `PUT`: 'POST';
        const form = new FormData(
            document.getElementById('subsection-form')
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
                document.getElementById(`${data.subsection_id}`).remove();
                alert(
                    `${data.subsection_name} has been moved to ${data.destination}`, 
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
                    const spacer = document.getElementById('no-subsection-avalible');
                    if (spacer)
                        spacer.remove();
                    document.getElementById('subsection-column').appendChild(formatted_card);
                    alert('Lesson Successfully Created','success');
                }
            }
        }).catch(
            err => alert(err, 'danger')
        );
        document.getElementById('close-subsection-form').click()
    }
);


dragula(
    [ document.getElementById('subsection-column') ]
).on('drop', async (el, target, src, sibling) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ordered_names = Array.from(
        document.querySelectorAll('.subsection-menu-card:not(.gu-transit)')
    ).map(item => item.id)
    console.log(ordered_names)

    fetch('/subsections/reorder', {
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