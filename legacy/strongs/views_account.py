# -*- coding: utf8 -*-
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from django.contrib.auth.views import login
from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from strongs.forms import MyAccountForm, RegistrationForm

__author__ = 'mirkohecky'


@login_required
def my_account(request):
    user = request.user
    if request.method == 'POST':
        form = MyAccountForm(request.POST)
        if form.is_valid():
            if request.POST['password'] == request.POST['password2']:
                # user = User.objects.get(user=request.user)
                if request.POST['username'] != '':
                    user.username = request.POST['username']
                if request.POST['password'] != '':
                    user.set_password(request.POST['password']),
                user.email = request.POST['email']
                user.first_name = request.POST['first_name']
                user.last_name = request.POST['last_name']
                user.save()
            else:
                return render_to_response('strongs/account.html', {'error': 'Die beiden Passwörter stimmen nicht überein!'}, context_instance=RequestContext(request))
    else:
        form = MyAccountForm()

    return render_to_response('strongs/account.html', {'form': form, 'fn': user.first_name, 'ln': user.last_name, 'email': user.email, 'un': user.username}, context_instance=RequestContext(request))


def register(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect('/account/')
    else:
        if request.method == 'POST':
            uf = RegistrationForm(request.POST, prefix='user')
            # upf = RegistrationForm2(request.POST, prefix='userprofile')
            if uf.is_valid():
                if uf.cleaned_data['password'] == uf.cleaned_data['password2']:
                    user = uf.save(commit=False)
                    user.password = make_password(user.password)
                    user.save()
                    # userprofile = upf.save(commit=False)
                    # userprofile.user = user
                    # userprofile.save()
                    return HttpResponseRedirect(request.POST['next'])
                else:
                    return render_to_response('strongs/register.html', {'error': 'Die beiden Passwörter stimmen nicht überein!'}, context_instance=RequestContext(request))
        else:
            uf = RegistrationForm(prefix='user')
            # upf = RegistrationForm2(prefix='userprofile')
        return render_to_response('strongs/register.html', None, context_instance=RequestContext(request))


def custom_login(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect('/')
    else:
        return login(request)