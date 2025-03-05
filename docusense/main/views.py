from pyexpat.errors import messages
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from main.forms import AnalysisForm
from main.models import Analysis, MainUser
import json
from django.http import JsonResponse
from django.conf import settings
import os
from django.views.decorators.csrf import csrf_exempt
import json
from .models import UploadedDocument
from django.db.models import Q
from .models import Annotation
import google.generativeai as genai
from django.contrib.auth.decorators import login_required
from django.core.files.storage import FileSystemStorage
from django.contrib.auth import logout
from django.shortcuts import redirect

genai.configure(api_key='AIzaSyDK-HUZY-kkLZAW_yjuqeJYASUsC_QKGXw')

@login_required
def homepage(request):
    return render(request, 'main/DataAnalyse/home_page/homepage.html', context={"mainuser": MainUser.objects.all()})

@login_required
def get_uploaded_documents(request):
    analysis_name = request.GET.get('analysis') 

    if analysis_name:
        try:
            analysis = Analysis.objects.get(name=analysis_name) 
        except Analysis.DoesNotExist:
            return JsonResponse({"error": f"Analysis '{analysis_name}' not found."}, status=404)

        documents = UploadedDocument.objects.filter(analysis=analysis).values('id', 'name', 'file_path', 'upload_time', 'relevancy')
    else:
        documents = UploadedDocument.objects.all().values('id', 'name', 'file_path', 'upload_time', 'relevancy')

    return JsonResponse(list(documents), safe=False)

@login_required
def search_documents(request):
    search_term = request.GET.get("search", "").strip()
    data = json.loads(request.body)
    analysis = data.get("analysis")

    try:
        analysis = Analysis.objects.get(name=analysis)
    except Analysis.DoesNotExist:
        return JsonResponse({"error": f"Analysis '{analysis}' not found."}, status=404)

    if not search_term:
        return JsonResponse({"error": "Search term cannot be empty."}, status=400)

    try:
        documents_path = os.path.join('media', 'documents')
        filtered_documents = []
        for document in UploadedDocument.objects.filter(user=request.user, analysis=analysis):
            file_path = os.path.join(documents_path, document.name)
            if os.path.isfile(file_path):
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if search_term.lower() in content.lower() or search_term.lower() in document.name.lower():
                        filtered_documents.append({
                            "name": document.name,
                            "relevancy": document.relevancy
                        })

        return JsonResponse(filtered_documents, safe=False)

    except Exception as e:
        print(f"Error in search_documents: {e}")
        return JsonResponse({"error": "An unexpected error occurred."}, status=500)

@login_required
def save_annotation(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            document_name = data.get('document_name')
            annotation_content = data.get('content')
            annotation_note = data.get("note")
            analysis = data.get("analysis")
            if not document_name or not annotation_content or not annotation_note:
                return JsonResponse({"error": "Missing document_name, content, or note."}, status=400)

            try:
                document = UploadedDocument.objects.get(name=document_name)
            except UploadedDocument.DoesNotExist:
                return JsonResponse({"error": f"Document '{document_name}' not found."}, status=404)
            
            try:
                analysis = Analysis.objects.get(name=analysis)
            except Analysis.DoesNotExist:
                return JsonResponse({"error": f"Analysis '{analysis}' not found."}, status=404)

            annotation = Annotation.objects.create(document=document, content=annotation_content, note=annotation_note, user=request.user, analysis=analysis)
            return JsonResponse({"message": "Annotation saved successfully.", "id": annotation.id})

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data."}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)

    return JsonResponse({"error": "Invalid request method."}, status=405)

@login_required
def get_annotations(request):
    document_name = request.GET.get('document_name') 
    try:
        document = UploadedDocument.objects.get(name=document_name)
        annotations = document.annotations.all().values('id', 'content', 'created_at', 'note')
        return JsonResponse(list(annotations), safe=False)

    except UploadedDocument.DoesNotExist:
        return JsonResponse({"error": f"Document '{document_name}' not found."}, status=404)

    except Exception as e:
        print(f"Error in get_annotations: {e}")
        return JsonResponse({"error": "An unexpected error occurred."}, status=500)




from main.models import MainUser
@login_required
def annotation_view(request):
    return render(request, 'annotation/annotation.html')

@login_required
def get_documents(request):
    analysis_name = request.GET.get('analysis')
    
    if not analysis_name:
        return JsonResponse({"error": "Analysis name is required."}, status=400)
    
    documents = UploadedDocument.objects.filter(user=request.user,analysis=analysis_name)

    documents_data = [
        {
            "id": doc.id,
            "name": doc.name,
            "file_path": doc.file_path,  # Assuming the file path or URL is stored in the model
            "uploaded_at": doc.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')  # Format date as a string
        }
        for doc in documents
    ]

    return JsonResponse({"documents": documents_data})

@login_required
def get_document_content(request):
    document_name = request.GET.get("document")
    
    if not document_name:
        return JsonResponse({"error": "No document specified."}, status=400)

    try:
        document = UploadedDocument.objects.get(name=document_name)
        document_path = os.path.join(settings.MEDIA_ROOT, str(document.file_path))
        with open(document_path, "r") as file:
            content = file.read()
        annotations = Annotation.objects.filter(document=document).values('content', 'note')


        return JsonResponse({"name": document_name, "content": content, "annotations": list(annotations)})
    except UploadedDocument.DoesNotExist:
        return JsonResponse({"error": f"Document '{document_name}' not found."}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"An error occurred: {str(e)}"}, status=500)

@login_required
def generate_document_summary(request):
    try:
        data = json.loads(request.body)

        summary_type = data.get('summary_type')
        analysis_name = data.get('analysis')
        query = data.get('query') 
        user = request.user
        prompt = query if query else "Summarize the following document content:"

        if summary_type == "file":
            document_name = data.get("document_name")
            if not document_name:
                return JsonResponse({"error": "Document name is required."}, status=400)
            try:
                document = UploadedDocument.objects.get(user=user, name=document_name, analysis__name=analysis_name)
            except UploadedDocument.DoesNotExist:
                return JsonResponse({"error": f"Document '{document_name}' not found for this user and analysis."}, status=404)
            document_path = os.path.join(settings.MEDIA_ROOT, 'documents', document.name) 
            try:
                with open(document_path, "r") as file:
                    content = file.read()  
            except Exception as e:
                return JsonResponse({"error": f"Error reading document: {str(e)}"}, status=500)

            response = genai.GenerativeModel(model_name="gemini-1.5-flash").generate_content(f"{prompt}:\n\n{content}")
            summary = response.text

            return JsonResponse({"summary": summary})

        elif summary_type == "entire":
            all_text = ""
            try:
                analysis = Analysis.objects.get(name=analysis_name)
            except Analysis.DoesNotExist:
                return JsonResponse({"error": f"Analysis '{analysis_name}' not found."}, status=404)

            documents = UploadedDocument.objects.filter(user=user, analysis=analysis)
            if not documents:
                return JsonResponse({"error": f"No documents found for the analysis '{analysis_name}' and user."}, status=404)

            for document in documents:
                document_path = os.path.join(settings.MEDIA_ROOT, 'documents', document.name)
                try:
                    with open(document_path, 'r') as file:
                        all_text += f"{document.name}:\n{file.read()}\n\n"
                except Exception as e:
                    return JsonResponse({"error": f"Error reading document: {document.name}, {str(e)}"}, status=500)
            response = genai.GenerativeModel(model_name="gemini-1.5-flash").generate_content(f"{prompt}:\n\n{all_text}")
            summary = response.text

            return JsonResponse({"summary": summary})

        else:
            return JsonResponse({"error": "Invalid summary type."}, status=400)

    except Exception as e:
        return JsonResponse({"error": f"An error occurred: {str(e)}"}, status=500)

@login_required
def viewpage(request):
    return render(request = request,
                  template_name='main/DataAnalyse/view_page/viewpage.html'
                  )

@login_required
def annotation_page(request):
    analysis_name = request.GET.get('analysis')  
    return render(request, 'main/DataAnalyse/annotation/annotation.html', {
        'analysis': analysis_name
    })

@login_required
def viewpage(request):
    analyses = Analysis.objects.all()  
    return render(request, 'main/DataAnalyse/view_page/viewpage.html', {'analyses': analyses})

@login_required
def annotationpage(request):
    return render(request, 'main/DataAnalyse/annotation/annotation.html')
# @csrf_exempt
# def annotationpage(request):
#     if request.method == 'GET':
#         # Handle GET request for rendering the annotation page
#         analysis_name = request.GET.get('analysis')
#         document_name = request.GET.get('document')
        
#         if not analysis_name or not document_name:
#             return JsonResponse({"error": "Missing required parameters: analysis or document."}, status=400)
        
#         return render(request, 'main/DataAnalyse/annotation/annotation.html', {
#             'analysis': analysis_name,
#             'document': document_name
#         })
    
#     elif request.method == 'POST':
#         # Handle POST request for processing data
#         try:
#             data = json.loads(request.body)
#             document_name = data.get('document')
#             analysis_name = request.GET.get('analysis')
        

#             redirect_url = f"/annotation/?analysis={analysis_name}"
#             return JsonResponse({"redirect_url": redirect_url, "document": document_name})

#         except Exception as e:
#             print(f"Error: {e}")
#             return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)

#     return JsonResponse({"error": "Invalid request method."}, status=405)

@csrf_exempt
def loginpage(request):
    if request.method == 'GET':
        return render(request, 'main/DataAnalyse/login_page/loginpage.html')
    if request.method == 'POST':
        try:
            # Process login
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            print(username, password)
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                request.session.save()
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'success': False, 'message': 'Invalid username or password.'})
        except Exception as e:
            print(f"Error during login: {e}")
            return JsonResponse({'success': False, 'message': str(e)})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@csrf_exempt
def signuppage(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')

            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'message': 'Username already taken.'})
            elif User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': 'Email already registered.'})

            User.objects.create_user(username=username, email=email, password=password)
            return JsonResponse({'success': True, 'message': 'User registered successfully!'})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def create_analysis(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description')
            if name and description:
                AnalysisForm.objects.create(name=name, description=description)
                return JsonResponse({'success': True, 'message': 'Analysis saved successfully!'})
            else:
                return JsonResponse({'success': False, 'message': 'Both name and description are required.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def saveAnalysis(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description')
            if name and description:
                Analysis.objects.create(name=name, description=description, user=request.user)
                return JsonResponse({'success': True, 'message': 'Analysis saved successfully!'})
            else:
                return JsonResponse({'success': False, 'message': 'Both name and description are required.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def get_analyses(request):
    analyses = Analysis.objects.filter(user=request.user).values('name', 'description')
    return JsonResponse({'analyses': list(analyses)})

@login_required
def get_stannotations(request):
    analysis_name = request.GET.get('analysis')
    if not analysis_name:
        return JsonResponse({"error": "Analysis name is required."}, status=400)

    try:
        analysis = Analysis.objects.get(name=analysis_name, user=request.user)

        annotations = Annotation.objects.filter(user=request.user, analysis=analysis).values(
            'id',
            'content',
            'note',
            'created_at',
            'document__name',  
            'document__file_path', 
            'document__relevancy' 
        )

        annotations_data = [
            {
                "title": annotation['content'], 
                "source": annotation['document__name'],  
                "sourceLink": f"/annotation/?analysis={analysis}/",  
                "description": annotation['note'],  
                "dateAdded": annotation['created_at'].strftime('%Y-%m-%d'), 
                "tags": [annotation['document__relevancy']]  
            }
            for annotation in annotations
        ]
        return render(request, 'main/DataAnalyse/stored-annotations/stored_annotations.html', {'annotations': annotations_data})

    except Analysis.DoesNotExist:
        return JsonResponse({"error": f"Analysis '{analysis_name}' not found for this user."}, status=404)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)

@login_required
def delete_analyses(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            names = data.get('names', []) 
            if not names:
                return JsonResponse({'success': False, 'message': 'No items to delete.'})
            deleted_count, _ = Analysis.objects.filter(name__in=names).delete()
            
            if deleted_count > 0:
                return JsonResponse({'success': True, 'message': f'{deleted_count} items deleted successfully.'})
            else:
                return JsonResponse({'success': False, 'message': 'No matching items found to delete.'})

        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    else:
        return JsonResponse({'success': False, 'message': 'Invalid request method.'})
    
@login_required    
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file') and request.POST.get('analysis_name'):
        try:
            uploaded_file = request.FILES['file']
            analysis_name = request.POST.get('analysis_name')  

            if uploaded_file.content_type != 'text/plain':
                return JsonResponse({"error": "Only .txt files are allowed."}, status=400)
            analysis = Analysis.objects.get(name=analysis_name)
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'documents'))
            filename = fs.save(uploaded_file.name, uploaded_file)
            file_url = fs.url(filename)
            document = UploadedDocument.objects.create(
                user=request.user,  
                name=filename,      
                file_path=f"documents/{filename}", 
                analysis=analysis, 
                relevancy="low"  
            )

            return JsonResponse({
                'message': 'File uploaded successfully',
                'file_id': document.id,
                'file_name': document.name,
                'file_url': file_url
            })
        except Analysis.DoesNotExist:
            return JsonResponse({'error': 'Analysis not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method or missing data.'}, status=400)


@login_required
def update_annotation(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            annotation_id = data.get("id")
            updated_content = data.get("content")

            if not annotation_id or not updated_content:
                return JsonResponse({"error": "Annotation ID and content are required."}, status=400)
            annotation = Annotation.objects.filter(id=annotation_id).first()
            if not annotation:
                return JsonResponse({"error": "Annotation not found."}, status=404)

            annotation.content = updated_content
            annotation.save()

            return JsonResponse({"message": "Annotation updated successfully."})
        except Exception as e:
            return JsonResponse({"error": f"An error occurred: {str(e)}"}, status=500)
    else:
        return JsonResponse({"error": "Invalid request method."}, status=405)

@login_required
def delete_annotation(request):
    if request.method == "DELETE":
        annotation_id = request.GET.get("id")
        if not annotation_id:
            return JsonResponse({"error": "Annotation ID is required"}, status=400)

        try:
            annotation = Annotation.objects.get(id=annotation_id)
            annotation.delete() 
            return JsonResponse({"success": True, "message": "Annotation deleted successfully."})
        except Annotation.DoesNotExist:
            return JsonResponse({"error": "Annotation not found."}, status=404)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)

@login_required
def update_relevancy(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            document_name = data.get("document_name")
            new_relevancy = data.get("relevancy")

            document = UploadedDocument.objects.get(name=document_name)
            document.relevancy = new_relevancy
            document.save()

            return JsonResponse({"success": True})
        except UploadedDocument.DoesNotExist:
            return JsonResponse({"error": "Document not found."}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Invalid request method."}, status=405)

@login_required
def get_all_annotations(request):
    try:
        analysis_name = request.GET.get('analysis') 

        if not analysis_name:
            return JsonResponse({"error": "Analysis name is required."}, status=400)
        analysis = Analysis.objects.get(name=analysis_name, user=request.user)
        annotations = Annotation.objects.filter(user=request.user, analysis=analysis).select_related('document').values(
            'id',
            'content',
            'note',
            'created_at',
            'document__name',     
            'document__file_path', 
            'document__relevancy'  
        )
        annotations_data = list(annotations)

        return JsonResponse(annotations_data, safe=False)

    except Analysis.DoesNotExist:
        return JsonResponse({"error": f"Analysis '{analysis_name}' not found for this user."}, status=404)

    except Exception as e:
        print(f"Error fetching annotations: {e}")
        return JsonResponse({"error": "An unexpected error occurred."}, status=500)
    
@login_required
def delete_document(request):
    document_id = request.GET.get('document_id')
    try:
        document = UploadedDocument.objects.get(id=document_id, user=request.user)
        
        document_path = os.path.join(settings.MEDIA_ROOT, 'documents', document.name)
        if os.path.exists(document_path):
            os.remove(document_path)

        document.delete()
        return JsonResponse({"success": True})
    except UploadedDocument.DoesNotExist:
        return JsonResponse({"success": False, "error": "Document not found"})
    
def logout_view(request):
   logout(request)
   return redirect('/login_page') 