
document.querySelector('.carousel-item').classList.add('active')

function jumpToSlide(mock) {
    const activeSlide = document.querySelector('.carousel-item.active')
    if (activeSlide) {
        activeSlide.classList.remove('active')
    }
    const slide = document.querySelector(
        `.carousel-item[data-slide-id="${mock.dataset.slideId}"]`
    )
    slide.classList.add('active');
    document.getElementById("close-slide-offcanvas").click();
}

Array.from(document.getElementsByClassName("mock"))
     .forEach(
        mock => mock.addEventListener('click', event => jumpToSlide(mock))
    );

document.getElementById('subsection-edit-side-panel')
        .addEventListener('show.bs.offcanvas', event => {
    Array.from(event.target.querySelectorAll('.mock > div:not(.bg-opacity-10)'))
         .forEach(el => { el.classList.add('bg-opacity-10'); el.style.color = 'black' } );
    const activeSlide = document.querySelector('.carousel-item.active[data-slide-id]')
    if (activeSlide) {
        const slideMock = document.querySelector(
            `.mock[data-slide-id="${activeSlide.dataset.slideId}"]`
        )
        slideMock.firstElementChild.classList.remove('bg-opacity-10');
        slideMock.firstElementChild.style.color = 'white';
    }
});