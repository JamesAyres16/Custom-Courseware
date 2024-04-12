
function addMultipleChoiceOption(option_content, uuid) {
    let read_only_options =  {
        modules: {},
        readOnly: true
    };
    let editable_options = {
        modules: {
            toolbar: [
                [
                    { 'font': [] },
                    { 'size': [] }
                ],
                [
                    { 'color': [] }, { 'background': [] },
                    'bold', 'italic', 'underline', 'strike',
                ],
                [
                    { 'align': [] },
                    { 'indent': '-1'}, 
                    { 'indent': '+1' }
                ],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }, 'formula']
            ]
        },
        theme: 'snow' 
    };
    let tag = document.getElementById(
        `multiple-choice-answer-${uuid}`).childElementCount;
    let dropdownoption = document.createElement('option');
    dropdownoption.value = tag++;
    dropdownoption.innerText = tag;
    document.getElementById(`multiple-choice-answer-${uuid}`).appendChild(dropdownoption);
    console.log('added...')

    let wrapper = document.createElement('div');
    wrapper.classList.add('row');

    // option container
    let option_container = document.createElement('div');
    option_container.classList.add('col-11');

    let o_container_quil = new Quill(option_container, read_only_options);
    o_container_quil.setContents(option_content);

    // builds hidden data that will be sent with form
    let hidden_option = document.createElement('input');
    hidden_option.type = 'text';
    hidden_option.name = 'options';
    hidden_option.value = JSON.stringify(o_container_quil.getContents());
    document.getElementById(
        `mutiple-choice-options-container-${uuid}`
    ).appendChild(hidden_option);

    let mod_container = document.createElement('div');
    mod_container.classList.add('col-1', 'ps-2');
    let inner_mod_container = document.createElement('div');
    inner_mod_container.classList.add('d-flex', 'justify-content-end');
    mod_container.appendChild(inner_mod_container)
    let trash = document.createElement('i');
    trash.classList.add(
        'bi', 'bi-trash', 'm-2', 'fs-4', 'hover-red'
    );
    trash.addEventListener('click', event => {
        wrapper.remove()
        hidden_option.remove()
        dropdownoption.remove()

        let tag = 0
        for (
            let op_sel of 
            document.getElementById(`multiple-choice-answer-${uuid}`).children
        ) {
            op_sel.value = tag++; 
            op_sel.innerText = tag; 
        }
    })

    let edit = document.createElement('i');
    edit.classList.add(
        'bi', 'bi-pencil', 'm-2', 'fs-4', 'hover-primary'
    );
    edit.addEventListener('click', event => {
        let update_quil = new Quill(
            `#multiple-choice-update-option-editor-${uuid}`, editable_options
        )
        update_quil.setContents(o_container_quil.getContents())
        
        document.getElementById(
            `update-multiple-choice-${uuid}`
        ).addEventListener('click', event => {
            // sync back from update modal
            o_container_quil.setContents(update_quil.getContents())   
            hidden_option.value = JSON.stringify(o_container_quil.getContents());    
            document.getElementById(`edit-multiple-choice-btn-${uuid}`).click();
        })
        document.getElementById(`edit-multiple-choice-btn-${uuid}`).click();
    })

    // add elements to DOM
    inner_mod_container.appendChild(edit);
    inner_mod_container.appendChild(trash);

    wrapper.appendChild(option_container);
    wrapper.appendChild(mod_container);

    document.getElementById(
        `mutiple-choice-option-display-${uuid}`
    ).appendChild(wrapper);
}


function regesterMultipleChoiceBtn(btn) {
    console.log('registering...')
    let uuid = btn.dataset.uuid;
    let option_quil = new Quill(
        '#multiple-choice-option-editor-' + uuid
    )
    btn.addEventListener('click', event => {
        // check if question and answer are provided
        if (option_quil.getLength() <= 1) {
            alert('Answer textbox must be filled out.', 'info');
            return
        }
        addMultipleChoiceOption(
            option_quil.getContents(), uuid
        )
    });
}

for (
    let addMultipleChoiceBtn of 
    document.getElementsByClassName('multiple-choice-option-add')
) {
    regesterMultipleChoiceBtn(addMultipleChoiceBtn);
}