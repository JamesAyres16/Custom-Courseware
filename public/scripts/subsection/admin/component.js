function delete_component_verification(event) {
    const container = event.relatedTarget.parentElement;
    const thing_to_be_deleted = document.getElementById(
        'thing-to-be-deleted'
    )
    thing_to_be_deleted.dataset.componentId = container.dataset.componentId;
    thing_to_be_deleted.innerText = 'Component'
    document.getElementById('delete-verified')
            .dataset
            .deleteVerifiedFunc = 'delete_component';
}

function delete_component() {
    const componentId = document.getElementById('thing-to-be-deleted')
                                .dataset
                                .componentId;
    fetch(`/components/${componentId}`, {
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
        document.querySelector(`div[data-component-id="${componentId}"]`).remove();
        document.getElementById('add-element-panel')
                .querySelector('button[data-bs-dismiss="offcanvas"]')
                .click()
        alert('Component Deleted', 'success');
        document.getElementById('close-verify-delete').click()
    }).catch(
        err => alert(err, 'danger')
    )
}


Array.from(document.getElementsByClassName('edit-component'))
     .forEach(btn => addComponentEdit(btn));


document.getElementById('component-form-selector').addEventListener('change', event => {
    const val = document.getElementById('component-form-selector').value;
    for (const el of document.getElementsByClassName('component-form-container'))
        el.style.display = 'none';
    try {
        document.querySelector(`[data-form-container='${val}']`).style.display = 'block';
    }
    catch {
        console.log(`[data-form-container='${val}'] not found`)
    }
})

function addComponentEdit(btn) {
    btn.addEventListener('click', event => {
        const component = btn.closest('[data-component-id]')
        fetch(`/components/form/${component.dataset.componentId}`, {
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
            const htmlRes = new DOMParser().parseFromString(
                await res.text(), 'text/html'
            );

            const panel = document.getElementById('add-element-panel');
            const panelBody = panel.querySelector('.offcanvas-body');
            const formDropdown = document.getElementById('component-form-selector');
            formDropdown.style.display = 'none';
            
            const activeForm = panelBody.querySelector(
                '.component-form-container[style*="display: block"]'
            );
            if (activeForm)
                activeForm.style.display = 'none';
            
            const form = htmlRes.body.firstElementChild;    
            const container = document.createElement('div');
            container.appendChild(form)
            container.classList.add('col-12', 'mt-3', 'component-form-container');
            panelBody.appendChild(container);
            prepForm(form);

            panel.addEventListener('hidden.bs.offcanvas', e => {
                document.getElementById('element-operation').innerText = 'Add';
                formDropdown.value = 'Select Component'; 
                formDropdown.style.display = 'block';
                container.remove()
            });
            document.getElementById('element-operation').innerText = 'Edit';
            document.getElementById('open-element-panel').click()
        }).catch(
            err => alert(err, 'danger')
        );
    });
}


function prepForm(form, callScript = true) {
    const autoHeight = form.querySelector('.auto-height')
    const heightInput = form.querySelector('.height-input')

    if (autoHeight?.checked)  {
        heightInput.disabled = true;
        heightInput.value = '';
    }
    
    autoHeight.addEventListener('change', event => {
        if (autoHeight.checked) {
            heightInput.disabled = true;
            heightInput.value = ''
        }
        else {
            heightInput.disabled = false;
            heightInput.value = 50;
        }
    })

    const script = form.querySelector('script')
    if (script && callScript)
        eval(script.innerText)

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        await sleep(500);
        const currentSlide = document.querySelector(
            '.carousel-item.active'
        )
        if (currentSlide.id == "no-slides-avalible") {
            alert('You must create a Slide before adding a Component', 'danger');
            return;
        }
        console.log(form.tagName)
        const formData = new FormData(form);
        formData.append('slide', currentSlide.dataset.slideId)
        formData.append('componentTypeId', form.dataset.componentTypeId)

        let url, method;
        if (event.submitter.dataset.purpose == 'Add')
            [ url, method ] = [ '/components', 'POST' ];
        else 
            [ url, method ] = [ `/components/${form.dataset.componentId}`, 'PUT' ];

        fetch(url, {
            method: method,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData
        }).then(async res => {
            if (!res.ok) {
                const hasMsg = (
                    res.headers.get('content-type')?.includes('text/plain')
                );
                const msg = hasMsg ? await res.text() : 'Non-Ok Response';
                throw new Error(msg)
            }
            const htmlRes = new DOMParser().parseFromString(
                await res.text(), 'text/html'
            );
            const component = htmlRes.body.firstElementChild;
            addComponentEdit(component.querySelector('.edit-component'))
            if (method == 'POST') {
                currentSlide.querySelector('.row').appendChild(component);
                const spacer = currentSlide.querySelector('.no-components')
                if(spacer)
                    spacer.remove()
                alert(`New ${form.dataset.componentName} added`, 'success')
            }
            else {
                const oldComponent = document.querySelector(
                    `div[data-component-id="${form.dataset.componentId}"]`
                )
                oldComponent.parentElement.replaceChild(component, oldComponent)
                alert(`New ${form.dataset.componentName} edited`, 'success')
            }
            const script = component.querySelector('script')
            if (script)
                eval(script.innerText)
            
        }).catch(err => alert(err, 'danger'))
        // close form
        document.getElementById('close-element-panel').click()
    })    
}


Array.from(document.getElementsByTagName('form'))
     .forEach(form => prepForm(form, false));
