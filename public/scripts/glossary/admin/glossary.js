
function createContainer(letter) {
    const container = document.createElement('div');
    container.id = letter;
    container.classList.add('py-3')
    const containerTitle = document.createElement('h2')
    containerTitle.classList.add('pb-1', 'mb-3', 'border-bottom')
    containerTitle.innerText = letter 
    container.appendChild(containerTitle)
    return container;
}


document.getElementById('add-term-modal')
        .addEventListener('show.bs.modal', event => {
    const title = event.target.querySelector('.modal-title');
    const nameField = document.getElementById('name');
    const definitionField = document.getElementById('definition');
    const submit = event.target.querySelector('[type="submit"]');
    const method = event.relatedTarget.getAttribute('role');
    if (method == 'put') {
        const container = event.relatedTarget.closest('.term');
        title.innerText = 'Update Term';
        definitionField.value = container.querySelector('.description').innerText;
        nameField.value = container.dataset.termName;
        submit.setAttribute(
            'data-origin-id', container.id
        );
        submit.setAttribute(
            'data-term-id', container.dataset.termId
        );
    }
    else {
        title.innerText = 'New Term';
        definitionField.value = '';
        nameField.value = '';
        submit.setAttribute('data-origin-id', '');
        submit.setAttribute('data-term-id', '');
    }
});


document.getElementById('add-term-form')
        .addEventListener('submit', event => {
    event.preventDefault();
    const termId = event.submitter.getAttribute('data-term-id');
    const url = termId ? `/glossary/${termId}`: '/glossary/';
    const method = termId ? `PUT`: 'POST';
    const form = new FormData(event.target);
    const formData = Object.fromEntries(form.entries())
    fetch(url, {
        method: method,
        headers: { 
            'content-type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: "application/json"
        },
        body: JSON.stringify(formData)
    }).then(async res => {
        if (!res.ok) {
            const hasMsg = (
                res.headers.get('content-type')?.includes('text/plain')
            );
            const msg = hasMsg ? await res.text() : 'Non-Ok Response';
            throw new Error(msg)
        }
        const data = await res.text();
        const htmlRes = (new DOMParser()).parseFromString(data, 'text/html')
        const termDiv = htmlRes.body.firstElementChild;
        const oldTermDiv = event.submitter.getAttribute('data-origin-id');
        if (oldTermDiv) {
            document.getElementById(oldTermDiv).replaceWith(termDiv);
            alert('Term Successfully Updated','success');
        }
        else {
            const spacer = document.getElementById('spacer');
            if (spacer)
                spacer.remove();
            const letter = termDiv.dataset.termName[0].toUpperCase();
            const letterContainer = document.getElementById(letter);
            if (!letterContainer) {
                const termCol = document.getElementById('term-col');
                const container = createContainer(letter)
                container.appendChild(termDiv)
                let inserted = false;
                for (const child of termCol.children) {
                    if (child.id > letter) {
                        termCol.insertBefore(container, child);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted)
                    termCol.appendChild(container)
            }
            else {
                let inserted = false;
                for (const term of letterContainer.children) {
                    if (term.dataset.termName > termDiv.dataset.termName) {
                        letterContainer.insertBefore(termDiv, term)
                        inserted = true;
                        break;
                    }
                }
                if (!inserted)
                    letterContainer.appendChild(termDiv);
            }
            alert('Term Successfully Created','success');
        }
    }).catch(
        err => alert(err, 'danger')
    );
    document.getElementById('close-term-form').click()
})


function delete_term_verification(event) {
    const container = event.relatedTarget.closest('[data-term-id]');

    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    thing_to_be_deleted.innerText = container.dataset.termName;
    thing_to_be_deleted.dataset.termName = container.dataset.termName;
    thing_to_be_deleted.dataset.termId = container.dataset.termId;
    thing_to_be_deleted.dataset.containerId = container.id;

    const submit = document.getElementById('delete-verified')
    submit.dataset.deleteVerifiedFunc = 'delete_term';

    const popup = document.getElementById("verify-delete-modal")
    function cleanup(event) {
        document.querySelector('[data-bs-target="#glossary-modal"]').click()
        popup.removeEventListener('hide.bs.modal', cleanup);
    }
    popup.addEventListener('hide.bs.modal', cleanup);
}

function delete_term(event) {
    const thing_to_be_deleted = document.getElementById('thing-to-be-deleted');
    fetch(`/glossary/${thing_to_be_deleted.dataset.termId}`, {
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
        document.getElementById(thing_to_be_deleted.dataset.containerId).remove()
        const letter = thing_to_be_deleted.dataset.termName[0]
        const letterContainer = document.getElementById(letter)
        if (letterContainer.childElementCount == 1)
            letterContainer.remove();
        const termCol = document.getElementById('term-col')
        if (termCol.childElementCount == 0) 
            termCol.innerHTML = '<h2 id="spacer" class="py-3">No Terms Found</h2>'
        alert('Term Removed', 'success')
    }).catch(
        err => alert(err, 'danger')
    )
    document.getElementById('close-verify-delete').click()
}