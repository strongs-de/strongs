from django import forms

class NoteForm(forms.Form):
    note = forms.CharField(widget=forms.Textarea)
