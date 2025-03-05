
let annotations = []; 
const cardListContainer = document.querySelector('.card-list');

const urlParams = new URLSearchParams(window.location.search);
const analysisName = urlParams.get("analysis");
fetch('/api/get-all-annotations/?analysis=' + analysisName)
    .then(response => response.json())
    .then(data => {
        annotations = data; 
        populateTagSelect(annotations); 
        displayAnnotations(annotations); 
    })
    .catch(error => console.error("Error fetching annotations:", error));

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name); 
}

function displayAnnotations(filteredAnnotations) {
    cardListContainer.innerHTML = ''; 
    filteredAnnotations.forEach(annotation => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <h3 class="annotation-title">${annotation.content}</h3> 
            <p class="source-document">
                 Source: <span class="document-name" data-document-name="${annotation.document__name}">
                    ${annotation.document__name}
                </span>
                Source: <a href="/annotation?analysis=${encodeURIComponent(analysisName)}">${annotation.document__name}</a>  <!-- Source link -->
            </p>
            <p class="annotation-text">${annotation.note}</p> 
            <p class="annotation-meta">
                Date Added: ${new Date(annotation.created_at).toLocaleDateString()}<br>  
            </p>
            <p class="annotation-tags">
                Tags: 
                <span class="tag">${annotation.document__relevancy}</span> 
            </p>
        `;

        cardListContainer.appendChild(card); 
    });
}

function populateTagSelect(annotations) {
    const tags = new Set();
    annotations.forEach(annotation => {
        const relevancy = annotation.document__relevancy; 
        if (relevancy) {
            tags.add(relevancy);
        }
    });

    const tagSelect = document.getElementById('tagSelect');
    tagSelect.innerHTML = `<option value="" disabled selected>Select a tag</option>`;
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1); 
        tagSelect.appendChild(option);
    });
}

const tagSelect = document.getElementById('tagSelect');
const filterInput = document.getElementById('filterInput');
const resetButton = document.getElementById('resetButton');

tagSelect.addEventListener('change', function () {
    const selectedTag = tagSelect.value;
    const filteredAnnotations = annotations.filter(annotation =>
        annotation.document__relevancy === selectedTag 
    );
    displayAnnotations(filteredAnnotations);
});

filterInput.addEventListener('input', function () {
    const searchTerm = filterInput.value.toLowerCase();
    tagSelect.selectedIndex = 0; 
    const filteredAnnotations = annotations.filter(annotation =>
        annotation.content.toLowerCase().includes(searchTerm) ||
        annotation.note.toLowerCase().includes(searchTerm)
    );
    displayAnnotations(filteredAnnotations);
});

resetButton.addEventListener('click', function () {
    filterInput.value = ''; 
    tagSelect.selectedIndex = 0;
    displayAnnotations(annotations);
});

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.getElementById('return');
    const analysisName = getAnalysisName(); // Replace with the actual logic to get the analysis name.

    if (backButton) {
        backButton.addEventListener('click', function () {
            const url = `/annotation/?analysis=${encodeURIComponent(analysisName)}`;
            window.location.href = url;
        });
    }
});


function getAnalysisName() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('analysis'); 
  }
  