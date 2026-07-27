from django import forms
from models import UserData
from django.contrib.auth.models import User

class NoteForm(forms.Form):
    note = forms.CharField(widget=forms.Textarea)


class RegistrationForm(forms.ModelForm):
    password2 = forms.CharField(max_length=30)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'username', 'password']


class MyAccountForm(forms.ModelForm):
    password2 = forms.CharField(max_length=30)

    def is_valid(self):
        valid = True
        return valid

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'username', 'password']