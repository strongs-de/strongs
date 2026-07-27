# -*- coding: utf8 -*-
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from strongs.models import BibleVersList, BibleVers, BibleVersNote
from strongs.views import _get_date

__author__ = 'mirkohecky'


@login_required
def add_vers_to_list(request, vers, versListId='-1'):
    if int(versListId) == -1:
        versList = BibleVersList.objects.filter(user=request.user).order_by('-lastchanged')
    else:
        versList = BibleVersList.objects.filter(user=request.user, id=versListId)

    if versList.count() > 0:
        versList = versList[0]
        s = vers.split('_')
        if len(s) >= 3:
            bvers = BibleVers.objects.filter(bookNr__nr=s[0], chapterNr=s[1], versNr=s[2])
            if bvers.count() > 0 and not versList.containsVers(bvers):
                versNotes = BibleVersNote.objects.filter(user=request.user, versList=versList, vers=bvers[0])
                versNote = BibleVersNote(lastchanged=_get_date(), user=request.user, versList=versList, vers=bvers[0], order=versNotes.count())
                versNote.save()
                return HttpResponse('Ok')
    return HttpResponse('Could not save, cause there is no list available!')


@login_required
def remove_vers_from_list(request, vers):
    versList = BibleVersList.objects.filter(user=request.user).order_by('-lastchanged')
    if versList.count() > 0:
        versList = versList[0]
        s = vers.split('_')
        if len(s) >= 3:
            bvers = BibleVers.objects.filter(bookNr__nr=s[0], chapterNr=s[1], versNr=s[2])
            if bvers.count() > 0:
                versNotes = BibleVersNote.objects.filter(user=request.user, versList=versList, vers=bvers[0])
                if versNotes.count() > 0:
                    versNotes[0].delete()
                # versNote = BibleVersNote(user=request.user, versList=versList, vers=bvers[0], order=versNotes.count())
                # versNote.save()
                    return HttpResponse('Ok')
    return HttpResponse('Could not delete!')


@login_required
def set_verslist_title(request, id, t):
    versList = BibleVersList.objects.filter(user=request.user, id=id)
    if versList.count() > 0:
        versList = versList[0]
        versList.title = t
        versList.save()
        return HttpResponse('Ok')
    return HttpResponse('Could not change the verslist title')


@login_required
def create_verslist(request):
    versList = BibleVersList(lastchanged=_get_date(), user=request.user, title='Neue Versliste')
    versList.save()
    return HttpResponse('Ok')


@login_required
def select_verslist(request, id):
    versList = BibleVersList.objects.filter(user=request.user, id=id)
    if versList.count() > 0:
        versList = versList[0]
        versList.lastchanged = _get_date()
        versList.save()
        return HttpResponse('Ok')
    return HttpResponse('Could not find the requested vers list')


@login_required
def remove_verslist(request):
    versList = BibleVersList.objects.filter(user=request.user).order_by('-lastchanged')
    if versList.count() > 0:
        versList = versList[0]
        versList.delete()
        return HttpResponse('Ok')
    return HttpResponse('Could not delete the vers list')