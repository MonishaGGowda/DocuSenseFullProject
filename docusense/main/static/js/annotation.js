function openAllAnnotations() {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisName = urlParams.get('analysis');
    
    if (analysisName) {
        window.location.href = `/get_stannotations/?analysis=${encodeURIComponent(analysisName)}`;
    } else {
        console.error("Analysis name is missing.");
        alert("Analysis name is required.");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("annotation.js is loaded");
    const urlParams = new URLSearchParams(window.location.search);
    analysisName = urlParams.get("analysis");
    docName = "";

    docName = "";
    temp = null
    if (analysisName) {
        if (analysisName.includes("?")) {
            temp = analysisName.split("?"); 
            console.log(temp)
            analysisName = temp[0]
            fetchDocumentsForAnalysis(analysisName);
        }
        else {
        fetchDocumentsForAnalysis(analysisName);
        }
        if (temp != undefined && temp[1].includes("document=")) {
            docName = temp[1].split("document=")[1];
            selectDocument(docName)
        }
    }
    document.getElementById("documentContainer").addEventListener("mouseup", highlightText);
});

function fetchDocumentsForAnalysis(analysisName) {
    fetch(`/api/get-uploaded-documents/?analysis=${encodeURIComponent(analysisName)}`)
        .then(response => response.json())
        .then(data => {
            if (data != undefined) {
                renderDocumentList(data); 
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
    if (!documentName) {
        console.error("Invalid document name:", documentName);
        return;
    }

fetch(`/api/get-document-content/?document=${encodeURIComponent(documentName)}`)
.then(response => response.json())
.then(data => {
    if (data.content) {

        selectedDocument = data;

       
        const documentContainer = document.getElementById("documentContainer");
        documentContainer.innerHTML = `
            <h3>${data.name}</h3>
            <p>${data.content}</p>
        `; 

        fetch(`/api/get-annotations/?document_name=${encodeURIComponent(documentName)}`)
            .then(response => response.json())
            .then(annotations => {
                console.log(`Fetched annotations for ${documentName}:`, annotations);
                renderAnnotations(data.content, annotations); 
                updateAnnotationsPane(annotations); 
            })
            .catch(error => console.error("Error fetching annotations:", error));
    } else {
        alert(data.error || "Document content not found.");
    }
})
.catch(error => console.error("Error fetching document content:", error));
}

function renderAnnotations(documentContent, annotations) {
    const documentContainer = document.getElementById("documentContainer");

    annotations.forEach(annotation => {
        const highlightedText = annotation.content;  
        const note = annotation.note;              

        const highlightedContent = documentContent.replace(highlightedText, `<span class="highlight">${highlightedText}</span>`);

        documentContainer.innerHTML = highlightedContent;

        const noteContainer = document.getElementById("annotationsContainer");
        noteContainer.innerHTML += `
            <div class="annotation">
                <strong>Note:</strong> ${note}
            </div>
        `;
    });
}

function updateDocumentRelevancy(documentName, newRelevancy) {
    fetch("/api/update-relevancy/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        body: JSON.stringify({ document_name: documentName, relevancy: newRelevancy })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Relevancy for ${documentName} updated to ${newRelevancy}`);
        } else {
            alert(data.error || "Error updating relevancy.");
        }
    })
    .catch(error => console.error("Error updating relevancy:", error));
}




function toggleSummary() {
  const summaryType = getCheckedSummaryType(); 
  const summaryContainer = document.getElementById("summaryContainer");
  const urlParams = new URLSearchParams(window.location.search);
  const analysisName = urlParams.get("analysis");
  let url = "/api/generate-summary/";
  const queryText = document.getElementById("queryText").value.trim();
  const requestData = {
    summary_type: summaryType,
    analysis: analysisName,
    query: queryText,  
};

  if (summaryType=='file' && (!selectedDocument || !selectedDocument.name)) {
    console.error("No document selected or selectedDocument.name is undefined.");
    alert("Please select a document to generate its summary.");
    summaryContainer.style = "display:none";
    return;
}
   
if (summaryType === "file") {
    requestData.document_name = selectedDocument.name;
} else if (summaryType === "entire") {
    requestData.all_documents = true;
}

fetch("/api/generate-summary/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",  
        "X-CSRFToken": getCookie('csrftoken')  
    },
    body: JSON.stringify(requestData)
})
.then(response => response.json())
.then(data => {
    if (data.summary) {
        summaryContainer.style.display = "block";

        try {
            const summaryObject = JSON.parse(data.summary);
            summaryContainer.innerHTML = `<h2>Summary</h2>${formatSummaryAsHtml(summaryObject)}`;
        } catch (e) {
            console.log("Summary is not JSON. Rendering as plain text.");
            summaryContainer.innerHTML = `<h2>Summary</h2><p>${data.summary}</p>`;
        }
        document.getElementById("summaryContainer").textContent = data.summary;
    } else {
        alert("Error: " + (data.error || "Unable to generate summary."));
    }
})
.catch(error => console.error("Error generating summary:", error));
}

function getCheckedSummaryType() {
    const checkedRadioButton = document.querySelector('input[name="summaryType"]:checked');
    return checkedRadioButton ? checkedRadioButton.value : null;
}

function formatSummaryAsHtml(summaryObject) {
  let html = "";
  for (const [key, value] of Object.entries(summaryObject)) {
    if (typeof value === "object" && value !== null) {
      html += `<p><strong>${key}:</strong></p><ul>`;
      for (const [subKey, subValue] of Object.entries(value)) {
        html += `<li><strong>${subKey}:</strong> ${subValue}</li>`;
      }
      html += `</ul>`;
    } else {
      html += `<p><strong>${key}:</strong> ${value}</p>`;
    }
  }
  return html;
}

function getCheckedSummaryType() {
  const checkedRadioButton = document.querySelector('input[name="summaryType"]:checked');
  return checkedRadioButton ? checkedRadioButton.value : null;
}

let selectedDocument = null; 

function updateAnnotationsPane(annotations) {
    const annotationsContainer = document.getElementById("annotations");
    annotationsContainer.innerHTML = ""; 
    if (annotations && annotations.length > 0) {
        annotations.forEach(annotation => {
            const annotationElement = document.createElement('div');
            annotationElement.classList.add('annotation-item');
            
            const contentHeading = document.createElement('h3');
            contentHeading.classList.add('annotation-content');
            contentHeading.textContent = annotation.content;  
            annotationElement.appendChild(contentHeading);

            // Display note (user's annotation)
            const noteElement = document.createElement('p');
            noteElement.classList.add('annotation-note');
            noteElement.textContent = `Note: ${annotation.note}`;  
            annotationElement.appendChild(noteElement);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deleteAnnotation(annotation.id, selectedDocument.name);
            annotationElement.appendChild(deleteButton);

            annotationsContainer.appendChild(annotationElement);
        });
    } else {
        annotationsContainer.innerHTML = "<p>No annotations available.</p>";
    }
}


function deleteAnnotation(annotationId, documentName) {
    const confirmation = confirm("Are you sure you want to delete this annotation?");
    if (!confirmation) return;
    fetch(`/api/delete-annotation/?id=${encodeURIComponent(annotationId)}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')  
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Annotation deleted successfully!");
            fetchAnnotationsForDocument(documentName);  
        } else {
            alert("Error deleting annotation: " + data.error);
        }
    })
    .catch(error => console.error("Error deleting annotation:", error));
}

function fetchAnnotationsForDocument(documentName) {
    fetch(`/api/get-annotations/?document_name=${encodeURIComponent(documentName)}`)
        .then(response => response.json())
        .then(annotations => {
            updateAnnotationsPane(annotations);  
        })
        .catch(error => console.error("Error fetching annotations:", error));
}

function selectDocument(documentName) {
    if (!documentName) {
        console.error("Invalid document name:", documentName);
        return;
    }

    fetch(`/api/get-document-content/?document=${encodeURIComponent(documentName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.content) {
                selectedDocument = data;
                const documentContainer = document.getElementById("documentContainer");
                documentContainer.innerHTML = `
                    <h3>${data.name}</h3>
                    <p>${data.content}</p>
                `; 

                fetch(`/api/get-annotations/?document_name=${encodeURIComponent(documentName)}`)
                    .then(response => response.json())
                    .then(annotations => {
                        console.log(`Fetched annotations for ${documentName}:`, annotations);
                        updateAnnotationsPane(annotations); 
                        annotations.forEach(annotation => {
                            highlightAnnotation(annotation);  
                        });
                    })
                    .catch(error => console.error("Error fetching annotations:", error));
            } else {
                alert(data.error || "Document content not found.");
            }
        })
        .catch(error => console.error("Error fetching document content:", error));
}

function highlightAnnotation(annotation) {
    const documentContainer = document.getElementById("documentContainer");
    const content = documentContainer.innerHTML;
    const highlightedContent = content.replace(
        new RegExp(`(${annotation.content})`, 'g'),
        `<span class="highlight">${annotation.content}</span>`
    );

    documentContainer.innerHTML = highlightedContent;  
}

function toggleHighlighter() {
    const highlightIcon = document.getElementById("highlightIcon");
    const documentContainer = document.getElementById("documentContainer");
    if (!highlightIcon || !documentContainer) {
        console.error("Highlight icon or document container not found.");
        return;
    }

    isHighlighting = !isHighlighting;

    if (isHighlighting) {
        highlightIcon.classList.add("active");  
        documentContainer.addEventListener("mouseup", highlightText);  
    } else {
        highlightIcon.classList.remove("active"); 
        documentContainer.removeEventListener("mouseup", highlightText); 
    }
}

selectedText =""
function highlightText() {
    const selection = window.getSelection();  
    if (!selection.toString()) return;  

    const range = selection.getRangeAt(0);
    selectedText = selection.toString();  

    const span = document.createElement('span');
    span.className = 'highlight';  
    span.textContent = selectedText;

    range.deleteContents();
    range.insertNode(span);
    showAnnotationPopup(selectedText); 
}

function showAnnotationPopup(annotation = '') {
    const popup = document.getElementById("annotationPopup");
    const textarea = document.getElementById("annotationText");
    const heading = document.getElementById("annotationHeading");
    textarea.value = annotation; 
    heading.textContent = `Selected text: "${selectedText}"`;
    popup.style.display = "block"; 
  }

  function saveAnnotation() {
    const textarea = document.getElementById("annotationText");
    const newAnnotation = textarea.value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const analysisName = urlParams.get('analysis');

    if (newAnnotation === "") {
        alert("Please enter an annotation before saving.");
        return;
    }

    if (!selectedDocument || !selectedDocument.name) {
        alert("No document selected.");
        return;
    }

    fetch("/api/save-annotation/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')  
        },
        body: JSON.stringify({
            document_name: selectedDocument.name,
            content: selectedText,  
            note: newAnnotation,  
            analysis: analysisName  
        }),
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.error) {
            alert(data.error);
        } else {
            alert("Annotation saved successfully!");
            fetch(`/api/get-annotations/?document_name=${encodeURIComponent(selectedDocument.name)}`)
                .then((response) => response.json())
                .then((annotations) => {
                    updateAnnotationsPane(annotations);
                });

            textarea.value = "";
            closeAnnotationPopup();
        }
    })
    .catch((error) => console.error("Error saving annotation:", error));
}

function deleteDocument(documentId) {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisName = urlParams.get("analysis");
    const confirmation = confirm("Are you sure you want to delete this document?");
    if (!confirmation) return;

    fetch(`/api/delete-document/?document_id=${encodeURIComponent(documentId)}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')  // Include CSRF token for security
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Document deleted successfully!");
            fetchDocumentsForAnalysis(analysisName);  // Reload the documents list after deletion
        } else {
            alert("Error deleting document.");
        }
    })
    .catch(error => console.error("Error deleting document:", error));
}

function filterDocuments() {
    const searchText = document.getElementById("searchBox").value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const analysisName = urlParams.get('analysis');
    if (searchText === "") {
        fetchDocumentsForAnalysis(analysisName); 
        return;
    }

     const requestBody = {
        analysis: analysisName
     }
    fetch(`/api/search-documents/?search=${encodeURIComponent(searchText)}`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken()
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
  
            renderDocumentList(data)
        .catch(error => console.error("Error filtering documents:", error));
  })
}
  
  function clearFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisName = urlParams.get('analysis');
    
    document.getElementById("searchBox").value = ""; 
    fetchDocumentsForAnalysis(analysisName);
  }

function getCsrfToken() {
    var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (!csrfToken) {
        alert('CSRF token not found. Operation aborted.');
        return;
    }
    return csrfToken.value;
}
  