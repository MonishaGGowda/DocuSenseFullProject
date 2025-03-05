document.addEventListener('DOMContentLoaded', function () {
    console.log("viewpage.js loaded!");
    const analysisTable = document.getElementById("analysis-table");

    if (analysisTable) {
        analysisTable.addEventListener('click', function(event) {
            const analysisName = event.target.closest('tr')?.querySelector('td:nth-child(2)')?.textContent;
            if (analysisName) {
                fetchDocumentsForAnalysis(analysisName);
            }
        });
    }
});

function fetchDocumentsForAnalysis(analysisName) {
    fetch(`/api/get-documents-by-analysis/?analysis=${encodeURIComponent(analysisName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.documents) {
                renderDocumentList(data.documents); // Call render function to populate the document list
            } else {
                console.log("No documents found for this analysis.");
            }
        })
        .catch(error => console.error("Error fetching documents:", error));
}

function renderDocumentList(documents) {
    const documentList = document.getElementById("documentList");
    if (documentList) {
        documentList.innerHTML = "";  

        documents.forEach(doc => {
            const li = document.createElement("li");

            const docLink = document.createElement("a");
            docLink.href = "#";
            docLink.textContent = doc.name;
            docLink.onclick = () => selectDocument(doc.name); 

            const relevancySelect = document.createElement("select");
            relevancySelect.innerHTML = `
                <option value="high" ${doc.relevancy === "high" ? "selected" : ""}>High</option>
                <option value="low" ${doc.relevancy === "low" ? "selected" : ""}>Low</option>
            `;
            relevancySelect.onchange = () => updateDocumentRelevancy(doc.name, relevancySelect.value);

            const deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteButton");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deleteDocument(doc.id); // Use doc.id to identify the document

            li.appendChild(docLink);
            li.appendChild(relevancySelect);
            li.appendChild(deleteButton);
            documentList.appendChild(li);
        });
    }
}

function selectDocument(documentName) {
    // Fetch and display the content of the selected document
    fetch(`/api/get-document-content/?document=${encodeURIComponent(documentName)}`)
        .then(response => response.json())
        .then(data => {
            const documentContainer = document.getElementById("documentContainer");
            if (data.content) {
                documentContainer.innerHTML = `<h3>${data.name}</h3><p>${data.content}</p>`;
            } else {
                documentContainer.innerHTML = "Document content not found.";
            }
        })
        .catch(error => console.error("Error fetching document content:", error));
}

    // Display documents in the document list
    function displayDocuments(documents) {
        const documentList = document.getElementById("documentList");
        documentList.innerHTML = ""; 

        documents.forEach(doc => {
            const li = document.createElement("li");

            const docLink = document.createElement("a");
            docLink.href = "#";
            docLink.textContent = doc.name;
            docLink.onclick = () => selectDocument(doc.name); 

            const relevancySelect = document.createElement("select");
            relevancySelect.innerHTML = `
                <option value="high" ${doc.relevancy === "high" ? "selected" : ""}>High</option>
                <option value="low" ${doc.relevancy === "low" ? "selected" : ""}>Low</option>
            `;
            relevancySelect.onchange = () => updateDocumentRelevancy(doc.name, relevancySelect.value);

            li.appendChild(docLink);
            li.appendChild(relevancySelect);
            documentList.appendChild(li);
        });
    }
