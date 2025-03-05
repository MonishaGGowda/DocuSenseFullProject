from django.db import models
from django.contrib.auth.models import User

class MainUser(models.Model):
    name = models.TextField()

    def __str__(self):
        return self.name
    
class Analysis(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,default=1)

    def __str__(self):
        return self.name

class UploadedDocument(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE,default=1)
    name = models.CharField(max_length=255) 
    file_path = models.FileField(upload_to='documents/')  
    upload_time = models.DateTimeField(auto_now_add=True)  
    relevancy = models.CharField(max_length=10, choices=[("high", "High"), ("low", "Low")], default="low")
    analysis = models.ForeignKey(Analysis, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name

class Annotation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE,default=1)
    document = models.ForeignKey(UploadedDocument, on_delete=models.CASCADE,related_name='annotations')
    analysis = models.ForeignKey(Analysis, on_delete=models.SET_NULL, null=True, blank=True)
    content = models.TextField(blank=True, null=True)  
    note = models.TextField(blank=True, null=True)    
    start_index = models.IntegerField(default=0)  
    end_index = models.IntegerField(default=0)   
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Annotation for {self.document.name}: {self.content[:30]}..." 