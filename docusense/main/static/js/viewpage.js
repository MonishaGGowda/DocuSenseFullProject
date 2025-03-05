document.addEventListener('DOMContentLoaded', function () {
    fetch('/get_analyses/',{
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        populateTable(data.analyses);
    })
    .catch(error => console.error('Error:', error));
    const analysisTable = document.getElementById("analysis-table");
    if (analysisTable) {
        analysisTable.querySelector('tbody').addEventListener('click', function(event) {
            const analysisName = event.target.closest('tr')?.querySelector('td:nth-child(2)')?.textContent;
            if (event.target.type === "checkbox") {
                return;
            }
            const row = event.target.closest('tr');
            if (!row) {
                return;
            }
            if (analysisName) {
                window.location.href = `/annotation/?analysis=${encodeURIComponent(analysisName)}`;
            }
        });
    }
});

function fetchDocumentsForAnalysis(analysisName) {
    fetch(`/api/get-uploaded-documents/?analysis=${encodeURIComponent(analysisName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.documents) {
                renderDocumentList(data.documents);  
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
            deleteButton.onclick = () => deleteDocument(doc.id);  

            li.appendChild(docLink);
            li.appendChild(relevancySelect);
            li.appendChild(deleteButton);
            documentList.appendChild(li);
        });
    }
}

function selectDocument(documentName) {
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

function populateTable(data) {
    items =  data;
    const tableBody = document.querySelector('#analysis-table tbody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
      const noDataRow = document.createElement('tr');
      noDataRow.innerHTML = `<td colspan="3">No data available</td>`;
      tableBody.appendChild(noDataRow);
      return;
  }

    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="delete-checkbox" data-index="${index}" onclick="event.stopPropagation();"></td>
            <td><a href="${annotationPageUrl}?analysis=${encodeURIComponent(item.name)}">${item.name}</a></td>
            <td>${item.description}</td>
        `;
        tableBody.appendChild(row);
    });

    const rowsToAdd = 10 - data.length;
    for (let i = 0; i < rowsToAdd; i++) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        `;
        tableBody.appendChild(emptyRow);
    }
}

function deleteSelected() {
    const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
    const selectedNames = Array.from(checkboxes).map(checkbox => {
        const row = checkbox.closest('tr');
        return row.querySelector('td:nth-child(2)').textContent.trim();
    });

    if (selectedNames.length === 0) {
        alert('Please select at least one analysis to delete.');
        return;
    }

    fetch('/delete_analyses/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken() 
        },
        body: JSON.stringify({ names: selectedNames })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            location.reload(); 
        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error('Error deleting analyses:', error));
}

function getCSRFToken() {
    var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    return csrfToken;
  }