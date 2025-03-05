
let isHighlighting = false; 
let selectedText = '';       

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

function highlightText() {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();

  if (!selectedText) {
    console.log("No text selected.");
    return;
  }

  if (!isHighlighting) {
    console.log("Highlighter is disabled.");
    return;
  }

  const documentContainer = document.getElementById("documentContainer");
  let content = documentContainer.innerHTML;
  const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedText})`, "g");
  const highlighted = content.replace(regex, `<span class="highlight">${selectedText}</span>`);
  
  documentContainer.innerHTML = highlighted; 
  selection.removeAllRanges(); 
  showAnnotationPopup(selectedText);
}

function showAnnotationPopup(annotation = '') {
  const popup = document.getElementById("annotationPopup");
  const textarea = document.getElementById("annotationText");
  textarea.value = annotation; 
  popup.style.display = "block"; 
}

function saveAnnotation() {
  const textarea = document.getElementById("annotationText");
  const newAnnotation = textarea.value.trim();

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
      content: newAnnotation,
      note: selectedText, 
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

function updateAnnotationsPane(annotations) {
  const annotationsContainer = document.getElementById("annotationsContainer");
  annotationsContainer.innerHTML = ""; 
  if (annotations.length === 0) {
    annotationsContainer.innerHTML = "<p>No annotations available for this document.</p>";
  } else {
    annotations.forEach(annotation => {
      const annotationDiv = document.createElement("div");
      annotationDiv.classList.add("annotation-item");
      annotationDiv.setAttribute("data-id", annotation.id); 
      annotationDiv.innerHTML = `
        <p>${annotation.content}</p>
        <button onclick="editAnnotation(${annotation.id}, '${annotation.content}')">Edit</button>
        <button onclick="removeAnnotation(${annotation.id})">Remove</button>
      `;
      annotationsContainer.appendChild(annotationDiv);
    });
  }
}

function closeAnnotationPopup() {
  document.getElementById("annotationPopup").style.display = "none";
}

function uploadDocuments() {
  const fileInput = document.getElementById("fileUpload");
  const files = fileInput.files;

  if (files.length === 0) {
    alert("No files selected for upload.");
    return;
  }

  const analysisName = getAnalysisName(); 

  if (!analysisName) {
    alert("No analysis selected.");
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === "text/plain") {
      const formData = new FormData();
      formData.append("file", file);           
      formData.append("analysis_name", analysisName);  

      fetch("/upload-file/", {
        method: "POST",
        headers: {
          'X-CSRFToken': getCsrfToken(),  
        },
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            alert(`Error uploading file: ${data.error}`);
          } else {
            alert(`File uploaded successfully: ${data.file_name}`);
            console.log(`File URL: ${data.file_url}`);
            fetchDocumentsForAnalysis(analysisName); 
            fileInput.value = '';
          }
        })
        .catch((error) => {
          console.error("Error uploading file:", error);
        });
    } else {
      alert("Please upload only .txt files.");
    }
  }
}

function getAnalysisName() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('analysis'); 
}

function getCsrfToken() {
  var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  return csrfToken;
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
  return cookieValue;
}

function updateAnnotationsPane(annotations, relevancy) {
  const annotationsContainer = document.getElementById("annotationsContainer");
  annotationsContainer.innerHTML = ""; // Clear the container

  if (annotations.length === 0) {
      annotationsContainer.innerHTML = "<p>No annotations available for this document.</p>";
  } else {
      annotations.forEach(annotation => {
          const annotationDiv = document.createElement("div");
          annotationDiv.classList.add("annotation-item", `${relevancy}-relevancy`);
          annotationDiv.setAttribute("data-id", annotation.id); // Add unique identifier

          annotationDiv.innerHTML = `
              <p>${annotation.content}</p>
              <button onclick="editAnnotation(${annotation.id}, '${annotation.content}')">Edit</button>
              <button onclick="removeAnnotation(${annotation.id})">Remove</button>
          `;

          annotationsContainer.appendChild(annotationDiv);
      });
  }
}

function loadViewPage(){
    window.location = viewPageUrl;
}