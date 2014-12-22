# -*- coding: utf8 -*-
import math
import operator
import shlex
from django.db.models import Q
from django.shortcuts import render
from strongs.models import BibleText, BibleTranslation, BibleVersList, BibleVersNote
from strongs.utils import bible_translation_order, set_cookies
from strongs.views import BIBLES_IN_VIEW, _get_date, BIBLE_NAMES_IN_VIEW, BIBLE_HINTS_IN_VIEW

__author__ = 'mirkohecky'


def search(request, search, page, templateName, column=None, translation=None):
    search = search.strip()
    searches = search.split(' ')
    try:
        searches = map(lambda s: s.decode('UTF8').replace('"', '').replace("'", ''), shlex.split(search.encode('utf8')))
    except:
        pass
    tag_search = reduce(operator.and_, (Q(versText__contains=" " + x) | Q(versText__contains=">" + x) for x in searches))

    bible_order = bible_translation_order(request, column, translation)

    # Try to search for this word
    search1 = BibleText.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[0]]))
    search2 = BibleText.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[1]]))
    search3 = BibleText.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[2]]))
    search4 = BibleText.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[3]]))
    if search1.count() > 0 or search2.count() > 0 or search3.count() > 0 or search4.count() > 0:
        # only show the first 200 items
        num = 30
        idx1 = num * (int(page) - 1) if int(page) > 0 else 0
        idx2 = num * int(page) if int(page) > 0 else num
        count = max(search1.count(), search2.count(), search3.count(), search4.count())
        pagecnt = max(1, int(math.ceil(count * 1.0 / num)))

        # select the current verse list if user is logged in
        versLists = []
        versList = None
        versListItems = []
        if request.user.is_authenticated():
            versLists = BibleVersList.objects.filter(user=request.user).order_by('-lastchanged')
            if versLists.count() <= 0:
                versList = BibleVersList(lastchanged=_get_date(), title='Neue Versliste', user=request.user).save()
            else:
                versList = versLists[0]
                versListItems = BibleVersNote.objects.filter(user=request.user, versList=versList).order_by('order')
        # return render(request, 'strongs/search.html', {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': search, 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(search1[idx1:idx2], search2[idx1:idx2], search3[idx1:idx2], search4[idx1:idx2])})
        response = render(request, templateName, {'versLists': versLists, 'versListItems': versListItems, 'versList': versList, 'count1': search1.count(), 'count2': search2.count(), 'count3': search3.count(), 'count4': search4.count(), 'maxcount': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': search, 'translation1': BIBLE_NAMES_IN_VIEW[bible_order[0]], 'translation2': BIBLE_NAMES_IN_VIEW[bible_order[1]], 'translation3': BIBLE_NAMES_IN_VIEW[bible_order[2]], 'translation4': BIBLE_NAMES_IN_VIEW[bible_order[3]], 'verses1': search1[idx1:idx2], 'verses2': search2[idx1:idx2], 'verses3': search3[idx1:idx2], 'verses4': search4[idx1:idx2], 'bible_hint1': BIBLE_HINTS_IN_VIEW[bible_order[0]], 'bible_hint2': BIBLE_HINTS_IN_VIEW[bible_order[1]], 'bible_hint3': BIBLE_HINTS_IN_VIEW[bible_order[2]], 'bible_hint4': BIBLE_HINTS_IN_VIEW[bible_order[3]], 'trOptions': BIBLE_NAMES_IN_VIEW})

        # handle cookies
        set_cookies(response, bible_order)

        return response
        # return HttpResponse('Found ' + str(search1.count()) + ' verses')
    else:
        # return HttpResponse('No book found for %s' % search)
        return render(request, 'strongs/error.html', {'search': search, 'message': 'Diese Suche lieferte keine Ergebnisse zurück!', 'solution':u'Bitte verwende einen anderen Suchbegriff, oder verwende nur einen Teil des Wortes als Suchbegriff.<br/>Hinweis: Das Wort muss nicht vollständig ausgeschrieben sein!'})


def async_search(request, srch, page, column=None, translation=None):
    return search(request, srch, page, 'strongs/searchAsync.html', column, translation);


def search_strong(request, strong, templateName, page='1', column=None, translation=None):
    nr = strong[1:]

    bible_order = bible_translation_order(request, column, translation)

    search = "<gr str=\"" + str(nr) + "\""
    heb = False
    if strong[0].upper() == 'H':
        search1 = BibleText.objects.filter(vers__bookNr__nr__lt=40, versText__icontains=search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[0]))
        heb = True
    elif strong[0].upper() == 'G':
        search1 = BibleText.objects.filter(vers__bookNr__nr__gte=40, versText__icontains=search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[0]))
    else:
        return sync_search(request, strong, page)

    if search1.count() > 0:
        search2, search3, search4 = [], [], []
        count = search1.count()

        # only show the first 30 items
        num = 30
        idx1 = num * (int(page) - 1) if int(page) > 0 else 0
        idx2 = num * int(page) if int(page) > 0 else num
        search1 = search1[idx1:idx2]
        verses = search1.values('vers')

        # for x in search1:
        if bible_order[1] == 0:
            search2 = search1
            search1 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[0]], vers=verses)
        else:
            search2 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[1]], vers=verses)
        if bible_order[2] == 0:
            search3 = search1
            search1 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[0]], vers=verses)
        else:
            search3 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[2]], vers=verses)
        if bible_order[3] == 0:
            search4 = search1
            search1 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[0]], vers=verses)
        else:
            search4 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[bible_order[3]], vers=verses)
        # if s2.count() > 0:
            # search2.append(s2[0])
        # if s3.count() > 0:
            # search3.append(s3[0])
        # if s4.count() > 0:
            # search4.append(s4[0])

        pagecnt = max(1, int(math.ceil(count * 1.0 / num)))

        # select the current verse list if user is logged in
        versLists = []
        versList = None
        versListItems = []
        if request.user.is_authenticated():
            versLists = BibleVersList.objects.filter(user=request.user).order_by('-lastchanged')
            if versLists.count() <= 0:
                versList = BibleVersList(lastchanged=_get_date(), title='Neue Versliste', user=request.user).save()
            else:
                versList = versLists[0]
                versListItems = BibleVersNote.objects.filter(user=request.user, versList=versList).order_by('order')

        # return render(request, 'strongs/search.html', {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': strong, 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(search1, search2, search3, search4)})
        return render(request, templateName, {'versLists': versLists, 'versListItems': versListItems, 'versList': versList, 'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': strong, 'translation1': BIBLE_NAMES_IN_VIEW[bible_order[0]], 'translation2': BIBLE_NAMES_IN_VIEW[bible_order[1]], 'translation3': BIBLE_NAMES_IN_VIEW[bible_order[2]], 'translation4': BIBLE_NAMES_IN_VIEW[bible_order[3]], 'verses1': search1, 'verses2': search2, 'verses3': search3, 'verses4': search4, 'bible_hint1': BIBLE_HINTS_IN_VIEW[bible_order[0]], 'bible_hint2': BIBLE_HINTS_IN_VIEW[bible_order[1]], 'bible_hint3': BIBLE_HINTS_IN_VIEW[bible_order[2]], 'bible_hint4': BIBLE_HINTS_IN_VIEW[bible_order[3]], 'trOptions': BIBLE_NAMES_IN_VIEW})
    else:
        # return HttpResponse('No verses found for strong number ' + strong)
        alt = 'H' + strong[1:]
        if heb:
            alt = 'G' + strong[1:]
        return render(request, 'strongs/error.html', {'search': strong, 'message': 'Keine Verse mit dieser Strong-Nummer gefunden!', 'solution':u'Scheinbar existiert die Strong-Nummer ' + strong + ' nicht!<br/>Korrigiere deine Eingabe, oder probiere es einmal mit <a href="/' + alt + '">' + alt + '</a>.'})


def async_search_strong(request, strong, page='1'):
    return search_strong(request, strong, 'strongs/searchAsync.html', page)


def sync_search_strong(request, strong, page='1'):
    return search_strong(request, strong, 'strongs/searchNew.html', page)


def sync_search(request, srch, page):
    return search(request, srch, page, 'strongs/searchNew.html');