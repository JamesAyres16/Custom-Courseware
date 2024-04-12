


fetch('/glossary', {
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
    const terms = await res.json()
    const termColumn = document.getElementById('term-col');
    let lastLetter = null, letters = [];
    let letterContainer = document.createElement('div');
    if (terms.length > 0 ) {
        for (const term of terms) {
            if (term.name[0].toUpperCase() != lastLetter) {
                lastLetter = term.name[0].toUpperCase();
                const title = document.createElement('h2');
                title.classList.add('pb-1', 'mb-3', 'border-bottom', lastLetter);
                title.innerText = lastLetter;
                letterContainer = document.createElement('div');
                letterContainer.id = lastLetter;
                letterContainer.classList.add('py-3', 'letter-container');
                letterContainer.appendChild(title)
                letters.push(lastLetter);
                termColumn.appendChild(letterContainer);
            }
            letterContainer.innerHTML += term.html;
        }
        termColumn.innerHTML += '</div>';
    } 
    else
        termColumn.innerHTML += '<h2 id="spacer" class="py-3">No Terms Found</h2>';
}).catch(
    err => console.log(err)
);




function inTermDefinition(termEl, searchTerm) {
    const termDefinition = termEl.querySelector('.description');
    let updated = false;
    for (const p of termDefinition.querySelectorAll('p')) {
        if (p.innerHTML.search(searchTerm) == -1)
            continue;
        p.innerHTML = (
            p.innerHTML.replaceAll(searchTerm, `<mark>${searchTerm}</mark>`)
        )
        updated = true;
    }
    return updated;
}

function inTermName(termEl, searchTerm) {
    const termHeading = termEl.querySelector('.term-name');
    if (termHeading.innerHTML.search(searchTerm) == -1)
        return false;
    termHeading.innerHTML = (
        termHeading.innerHTML.replaceAll(searchTerm, `<mark>${searchTerm}</mark>`)
    )
    return true;
}

let searchToRun = false, runningSearch = false;
function runSeach() {
    if (!searchToRun || runningSearch)
        return;
    searchToRun = false;
    runningSearch = true;
    const searchTerm = document.getElementById('term-search').value;
    const termCol = document.getElementById('term-col');
    const letterContainers = document.getElementsByClassName('letter-container');
    for (const letterContainer of letterContainers)
        letterContainer.style.display = 'block';
    for (const termEl of termCol.querySelectorAll('.term')) {
        if (termEl.classList.contains('copy')) {
            termEl.remove();
            continue;
        }
        if (searchTerm.trim() == '') {
            termEl.style.display = 'block'
            continue;
        }
        termEl.style.display = 'none';

        const copy = termEl.cloneNode(true);
        copy.id = 'copy-' + copy.id;
        copy.classList.add('copy')
        copy.style.display = 'block'

        const checkName = (
            document.getElementById('complete-search').checked ||
            document.getElementById('terms-only').checked
        )
        const checkDefinition = (
            document.getElementById('complete-search').checked ||
            document.getElementById('definitions-only').checked
        )
        let found = false;
        if (checkName)
            found = inTermName(copy, searchTerm)
        if (checkDefinition)
            found = inTermDefinition(copy, searchTerm) || found
        if (found) {
            console.log(searchTerm + '->' + termEl.dataset.termName)
            termEl.after(copy);
        }
    }
    if (searchTerm.trim() != '') {
        for (const letterContainer of letterContainers) {
            if (letterContainer.getElementsByClassName('copy').length == 0)
                letterContainer.style.display = 'none';
        }
    }
    runningSearch = false;
}
setInterval(runSeach, 1500);

function triggerSearch() { searchToRun = true; }

document.getElementById('term-search').addEventListener('input', triggerSearch)

document.querySelectorAll("input[name='search-flag']").forEach(radio => {
    radio.addEventListener('change', triggerSearch);
});

