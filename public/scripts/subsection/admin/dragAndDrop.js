
let drag_drop_qa_tag = 0;

function addDragDropQA(q_content, a_content, uuid) {
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

    let tag = drag_drop_qa_tag;
    let row_container = document.createElement('div');
    row_container.classList.add('row', 'mb-3');
    row_container.dataset.tag = tag;

    // builds question container
    let q_container = document.createElement('div');
    q_container.classList.add('col');
    q_container.dataset.tag = tag;
    q_container.id = `q-container-${uuid}-${tag}`;

    let q_container_quil = new Quill(q_container, read_only_options);
    q_container_quil.setContents(q_content);

    // builds answer container
    let ans_container = document.createElement('div');
    ans_container.classList.add('col');
    ans_container.dataset.tag = tag;
    ans_container.id = `ans-container-${uuid}-${tag}`;

    let ans_container_quil = new Quill(ans_container, read_only_options);
    ans_container_quil.setContents(a_content);

    // builds hidden data that will be sent with form
    let hidden_question = document.createElement('input');
    hidden_question.type = 'text';
    hidden_question.name = 'questions';
    hidden_question.dataset.tag = tag;
    hidden_question.value = JSON.stringify(q_container_quil.getContents());
    q_container_quil.on('text-change', (delta, oldDelta, source) => {
        hidden_question.value = JSON.stringify(q_container_quil.getContents());
    });

    let hidden_answer = document.createElement('input');
    hidden_answer.type = 'text';
    hidden_answer.name = 'answers';
    hidden_answer.dataset.tag = tag;
    hidden_answer.value = JSON.stringify(ans_container_quil.getContents());
    ans_container_quil.on('text-change', (delta, oldDelta, source) => {
        hidden_answer.value = JSON.stringify(ans_container_quil.getContents());
    });

    let hidden_container = document.getElementById(`qa-container-${uuid}`)
    hidden_container.appendChild(hidden_question);
    hidden_container.appendChild(hidden_answer);

    // builds modification container
    let mod_container = document.createElement('div');
    mod_container.classList.add('col-1', 'ps-2');

    let trash = document.createElement('i');
    trash.classList.add(
        'bi', 'bi-trash', 'm-2', 'fs-4', 'd-block', 'hover-red'
    );
    trash.addEventListener('click', event => {
        const form = btn.closest('form');
        for (let el of form.querySelectorAll(
            `[data-tag="${hidden_question.dataset.tag}"]`
        ))
            el.remove()
    })
    mod_container.appendChild(trash)

    let edit = document.createElement('i');
    edit.classList.add(
        'bi', 'bi-pencil', 'mb-2', 'fs-4', 'd-block', 'hover-primary'
    );
    edit.addEventListener('click', event => {
        // preping q/a update modal
        let update_q_quil = new Quill(
            `#drag-drop-update-question-editor-${uuid}`, editable_options
        )
        update_q_quil.setContents(q_container_quil.getContents())
        let update_ans_quil = new Quill(
            `#drag-drop-update-answer-editor-${uuid}`, editable_options
        )
        update_ans_quil.setContents(ans_container_quil.getContents())
        
        document.getElementById(
            `update-qa-${uuid}`
        ).addEventListener('click', event => {
            // sync back from update modal
            q_container_quil.setContents(update_q_quil.getContents())           
            ans_container_quil.setContents(update_ans_quil.getContents())
            document.getElementById(`edit-qa-modal-btn-${uuid}`).click();
        })
        document.getElementById(`edit-qa-modal-btn-${uuid}`).click();
        document.getElementById(`edit-qa-modal-${uuid}`).style.zIndex = 1500;
    })
    mod_container.appendChild(edit);

    // add elements to DOM
    row_container.appendChild(q_container);
    row_container.appendChild(ans_container);
    row_container.appendChild(mod_container);
    document.getElementById(`qa-display-${uuid}`).prepend(row_container);

    drag_drop_qa_tag++;
}

function regesterDragDropBtn(btn) {
    let uuid = btn.dataset.uuid;
    let answer_quil = new Quill(
        '#drag-drop-answer-editor-' + uuid
    )
    let question_quil = new Quill(
        '#drag-drop-question-editor-' + uuid
    )
    btn.addEventListener('click', event => {
        // check if question and answer are provided
        if (question_quil.getLength() <= 1 || answer_quil.getLength() <= 1) {
            alert('Question and Answer must be filled out.', 'info');
            return
        }
        addDragDropQA(
            question_quil.getContents(), 
            answer_quil.getContents(),
            uuid
        )
    });
}

for (let addDragDropBtn of document.getElementsByClassName('drag-drop-add-qa')) {
    regesterDragDropBtn(addDragDropBtn);
}