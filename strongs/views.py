# -*- coding: utf-8 -*-
from django.shortcuts import render, render_to_response
from django.http import HttpResponse, HttpResponseRedirect
from models import BibleBook, BibleTranslation, BibleVers, StrongNr, BibleText, BibleVersList, BibleVersNote, UserData
from django.db.models import Q
from initDb import init_bible_books, insert_bible_vers, init_strong_grammar, insert_osis_bibles
import re
import xml.etree.ElementTree as ElementTree
from itertools import izip_longest
from django.db.models import Max
from collections import Counter
import operator
import shlex
from grammar_parser import get_grammar_name
from django.contrib.auth.decorators import login_required
from django.template import RequestContext, Template
from django.views.decorators.csrf import csrf_protect
from forms import NoteForm, RegistrationForm, MyAccountForm
import math
from django.contrib.auth.hashers import make_password
from django.contrib.auth.views import login
from strongs.utils import bible_translation_order
from strongs.utils import set_cookies
import time


BIBLES_IN_VIEW = ['ELB1905STR', 'SCH2000', 'LUTH1912', u'NGÜ']
BIBLE_NAMES_IN_VIEW = ['Elberfelder 1905', 'Schlachter 2000', 'Luther 1912', u'Neue Genfer Übersetzung']
BIBLE_HINTS_IN_VIEW = ['', '<br/>Bibeltext der Schlachter Übersetzung<br/>Copyright &copy; 2000 Genfer Bibelgesellschaft<br/>Wiedergegeben mit freundlicher Genehmigung. Alle Rechte vorbehalten.<br/>', '', '<br/>Bibeltext der Neuen Genfer Übersetzung – Neues Testament und Psalmen<br/>Copyright &copy; 2011 Genfer Bibelgesellschaft<br/>Wiedergegeben mit freundlicher Genehmigung. Alle Rechte vorbehalten.<br/>']


# Create your views here.
def index(request):
    return sync_bible(request, 'joh1')

def async_index(request, column=None, translation=None):
    return async_bible(request, 'joh1', column, translation)


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


def custom_login(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect('/account/')
    else:
        return login(request)


def find_translations(strong_nr, versText):
    translations = []
    # regex = re.compile('.*<gr str="' + str(strong_nr) + '">(.*)</gr>', re.UNICODE | re.IGNORECASE)
    # if regex is not None:
    # found = regex.search(versText)
    # if found is not None and found.groups() > 1:
    #     translations.append(found.group(1))
    search = '<gr str="' + str(strong_nr) + '">'
    idx = versText.find(search)
    while idx > -1:
        idx2 = versText.lower().find('</gr>', idx)
        if idx2 > 0:
            f = versText[idx + len(search):idx2]
            f = f.replace('"', '').replace("'", '')
            translations.append(f)
            idx = versText.find(search, idx2)
        else:
            break
    return translations


def strongs(request, strong_id, vers, word):
    '''
    Will be called if a strong number was clicked. This returns only a
    part of the HTML page which will be displayed in the info sidebar.
    '''
    vers = vers.replace('_', ',')
    grammar = None
    greek = None
    pronounciation = None
    regex = re.compile(u"([0-9]?\\.? ?[a-zA-ZäöüÄÖÜ]+)\s?([0-9]+)?,?([0-9]+)?")
    if regex is not None:
        v = regex.search(vers)
        if v is not None and len(v.groups()) > 0:
            book = BibleBook.objects.filter(short_name=v.group(1))
            search = "<gr str=\"" + str(strong_id) + "\""
            # search = "<gr str=\".*?" + str(strong_id) + ".*?\""
            if book.count() > 0:
                if book[0].nr < 40:
                    search1 = BibleText.objects.filter(vers__bookNr__nr__lt=40, versText__icontains=search, translationIdentifier__identifier=BIBLES_IN_VIEW[0])
                else:
                    search1 = BibleText.objects.filter(vers__bookNr__nr__gte=40, versText__icontains=search, translationIdentifier__identifier=BIBLES_IN_VIEW[0])
                if search1.count() > 0:
                    # bvers = BibleVers.objects.filter(bookNr=book, chapterNr=v.group(2), versNr=v.group(3))
                    if book[0].nr >= 40:
                        search2 = StrongNr.objects.filter(vers__bookNr=book[0], vers__chapterNr=v.group(2), vers__versNr=v.group(3), strongNr=strong_id)
                        if search2.count() > 0:
                            vers = book[0].name + ' ' + v.group(2) + ',' + v.group(3)
                            grammar = get_grammar_name(search2[0].grammar)
                            greek = search2[0].greek
                            pronounciation = search2[0].pronounciation


                    translations = []
                    for vers2 in search1:
                        translations = translations + find_translations(strong_id, vers2.versText)
                    occ = len(translations)
                    translations = Counter(translations)
                    translations = sorted(translations.iteritems(), key=operator.itemgetter(1), reverse=True)
                    appender = 'H' if book[0].nr < 40 else 'G'
                    return render(request, 'strongs/strongNr.html', {'pronounciation': pronounciation, 'word': word, 'strongnr': appender + strong_id, 'greek':greek, 'strong': appender + str(strong_id), 'grammar': grammar, 'vers': vers, 'occurences': occ, 'count': search1.count(), 'translations': translations})
    # return HttpResponse('No verses found for strong nr ' + str(strong_id))
    return render(request, 'strongs/error.html', {'message': u'Es wurden keine Verse für die Strong-Nummer ' + str(strong_id) + ' gefunden!', 'solution':'Evtl. existiert diese Strong Nummer nicht.'})

def async_bible(request, bible_book, column=None, translation=None):
    ret = bible(request, bible_book, 'strongs/bibleAsync.html', column, translation)
    if not ret:
        return async_search(request, bible_book, 1, column, translation)
    else:
        return ret

def sync_bible(request, bible_book):
    ret = bible(request, bible_book, 'strongs/bibleNew.html')
    if not ret:
        return sync_search(request, bible_book, 1)
    else:
        return ret



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


def _get_date():
    return time.strftime('%Y-%m-%d %H-%M-%S', time.localtime())


def bible(request, bible_book, templateName, column=None, translation=None):
    # if strong-number, then forward
    if bible_book.isdigit():
        return strongs(request, bible_book)

    regex = re.compile(u"([0-9]?\\.? ?[a-zA-ZäöüÄÖÜ]+)\s?([0-9]+)?,?([0-9]+)?", re.UNICODE)
    if regex is not None:
        s = regex.search(bible_book)
        if s is not None and len(s.groups()) > 0:
            book = BibleBook.objects.filter(Q(name__iexact=s.group(1)) | Q(short_name__iexact=s.group(1)) | Q(alternativeNames__icontains=',' + s.group(1) + ','))
            chapter = s.group(2) or 1
            vers = s.group(3) or None;
            if book.count() > 0:
                # get the last chapter for this book
                max_chapter = BibleVers.objects.filter(bookNr=book).aggregate(Max('chapterNr'))
                max_chapter = max_chapter['chapterNr__max']

                # verify that the chapter is > 1, else select the previous book
                if int(chapter) < 1 and book[0].nr > 1:
                    book = BibleBook.objects.filter(nr=book[0].nr - 1)
                    max_chapter = BibleVers.objects.filter(bookNr=book).aggregate(Max('chapterNr'))
                    max_chapter = max_chapter['chapterNr__max']
                    chapter = max_chapter

                if int(chapter) > max_chapter and book[0].nr < 66:
                    # try the next first chapter
                    book = BibleBook.objects.filter(nr=book[0].nr + 1)
                    chapter = 1

                bible_order = bible_translation_order(request, column, translation)

                tr1 = BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[0]])
                tr2 = BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[1]])
                tr3 = BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[2]])
                tr4 = BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[bible_order[3]])
                if tr1.count() > 0 and tr2.count() > 0 and tr3.count() > 0 and tr4.count() > 0:
                    verses1 = BibleText.objects.filter(translationIdentifier=tr1, vers__bookNr=book, vers__chapterNr=chapter)
                    verses2 = BibleText.objects.filter(translationIdentifier=tr2, vers__bookNr=book, vers__chapterNr=chapter)
                    verses3 = BibleText.objects.filter(translationIdentifier=tr3, vers__bookNr=book, vers__chapterNr=chapter)
                    verses4 = BibleText.objects.filter(translationIdentifier=tr4, vers__bookNr=book, vers__chapterNr=chapter)
                    if verses1.count() > 0 or verses2.count() > 0 or verses3.count() > 0 or verses4.count() > 0:
                        # return render(request, 'strongs/bible.html', {'vers': s.group(3), 'search': book[0].name + ' ' + str(chapter), 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(verses1, verses2, verses3, verses4)})
                        srch = book[0].name + ' ' + str(chapter)
                        if vers != None:
                            srch += ',' + str(vers)


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

                        response = render(request, templateName, {'versLists': versLists, 'versListItems': versListItems, 'versList': versList, 'full_url': request.build_absolute_uri(None),'vers': vers, 'search': srch, 'translation1': BIBLE_NAMES_IN_VIEW[bible_order[0]], 'translation2': BIBLE_NAMES_IN_VIEW[bible_order[1]], 'translation3': BIBLE_NAMES_IN_VIEW[bible_order[2]], 'translation4': BIBLE_NAMES_IN_VIEW[bible_order[3]], 'verses1': verses1, 'verses2': verses2, 'verses3': verses3, 'verses4': verses4, 'bible_hint1': BIBLE_HINTS_IN_VIEW[bible_order[0]], 'bible_hint2': BIBLE_HINTS_IN_VIEW[bible_order[1]], 'bible_hint3': BIBLE_HINTS_IN_VIEW[bible_order[2]], 'bible_hint4': BIBLE_HINTS_IN_VIEW[bible_order[3]]})

                        # handle cookies
                        set_cookies(response, bible_order)

                        return response;

                    else:
                        # return HttpResponse('No verses found')
                        return render(request, 'strongs/error.html', {'message': u'Die Bibelstelle konnte nicht geladen werden!', 'solution':u'Versuche es bitte später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})
                else:
                    # return HttpResponse('No translation found')
                    return render(request, 'strongs/error.html', {'message': u'Die Übersetzungen konnten nicht geladen werden!', 'solution':'Probiere es bitte später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})
            else:
                # Try to search for this word
                return False
        else:
            # return HttpResponse('Keine Bibelstelle oder Strong Nummer eingegeben1!')
            return render(request, 'strongs/error.html', {'message': 'Es wurde im Suchfeld nichts eingegeben!', 'solution':u'Bitte gebe in dem Suchfeld eine Bibelstelle, einen beliebigen Suchbegriff oder eine<br/>Strong-Nummer (G = griechisch oder H = hebräisch, z.B. "G4506") ein.'})
    else:
        return render(request, 'strongs/error.html', {'message': 'Es ist ein Fehler aufgetreten!', 'solution':u'Bitte probiere es später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})


def sync_search_strong(request, strong, page='1'):
    return search_strong(request, strong, 'strongs/searchNew.html', page)


def async_search_strong(request, strong, page='1'):
    return search_strong(request, strong, 'strongs/searchAsync.html', page)


def search_strong(request, strong, templateName, page='1'):
    nr = strong[1:]

    search = "<gr str=\"" + str(nr) + "\""
    heb = False
    if strong[0].upper() == 'H':
        search1 = BibleText.objects.filter(vers__bookNr__nr__lt=40, versText__icontains=search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[0]))
        heb = True
    elif strong[0].upper() == 'G':
        search1 = BibleText.objects.filter(vers__bookNr__nr__gte=40, versText__icontains=search, translationIdentifier=BibleTranslation.objects.filter(identifier=BIBLES_IN_VIEW[0]))

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
        search2 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[1], vers=verses)
        search3 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[2], vers=verses)
        search4 = BibleText.objects.filter(translationIdentifier__identifier=BIBLES_IN_VIEW[3], vers=verses)
        # if s2.count() > 0:
            # search2.append(s2[0])
        # if s3.count() > 0:
            # search3.append(s3[0])
        # if s4.count() > 0:
            # search4.append(s4[0])

        pagecnt = max(1, int(math.ceil(count * 1.0 / num)))
        # return render(request, 'strongs/search.html', {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': strong, 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(search1, search2, search3, search4)})
        return render(request, templateName, {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': strong, 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses1': search1, 'verses2': search2, 'verses3': search3, 'verses4': search4})
    else:
        # return HttpResponse('No verses found for strong number ' + strong)
        alt = 'H' + strong[1:]
        if heb:
            alt = 'G' + strong[1:]
        return render(request, 'strongs/error.html', {'message': 'Keine Verse mit dieser Strong-Nummer gefunden!', 'solution':u'Scheinbar existiert die Strong-Nummer ' + strong + ' nicht!<br/>Korrigiere deine Eingabe, oder probiere es einmal mit <a href="/' + alt + '">' + alt + '</a>.'})


def sync_search(request, srch, page):
    return search(request, srch, page, 'strongs/searchNew.html');


def async_search(request, srch, page, column=None, translation=None):
    return search(request, srch, page, 'strongs/searchAsync.html', column, translation);


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
        response = render(request, templateName, {'count1': search1.count(), 'count2': search2.count(), 'count3': search3.count(), 'count4': search4.count(), 'maxcount': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': search, 'translation1': BIBLE_NAMES_IN_VIEW[bible_order[0]], 'translation2': BIBLE_NAMES_IN_VIEW[bible_order[1]], 'translation3': BIBLE_NAMES_IN_VIEW[bible_order[2]], 'translation4': BIBLE_NAMES_IN_VIEW[bible_order[3]], 'verses1': search1[idx1:idx2], 'verses2': search2[idx1:idx2], 'verses3': search3[idx1:idx2], 'verses4': search4[idx1:idx2], 'bible_hint1': BIBLE_HINTS_IN_VIEW[bible_order[0]], 'bible_hint2': BIBLE_HINTS_IN_VIEW[bible_order[1]], 'bible_hint3': BIBLE_HINTS_IN_VIEW[bible_order[2]], 'bible_hint4': BIBLE_HINTS_IN_VIEW[bible_order[3]]})

        # handle cookies
        set_cookies(response, bible_order)

        return response
        # return HttpResponse('Found ' + str(search1.count()) + ' verses')
    else:
        # return HttpResponse('No book found for %s' % search)
        return render(request, 'strongs/error.html', {'message': 'Diese Suche lieferte keine Ergebnisse zurück!', 'solution':u'Bitte verwende einen anderen Suchbegriff, oder verwende nur einen Teil des Wortes als Suchbegriff.<br/>Hinweis: Das Wort muss nicht vollständig ausgeschrieben sein!'})

def element_to_string(element):
    s = element.text or ""
    for sub_element in element:
        s += ElementTree.tostring(sub_element)
    s += element.tail
    # s = s.replace('<gr', '<a')
    # s = s.replace('</gr>', '</a>')
    return s


def initDb(request):
    s = ''
    # s += init_bible_books()
    s += insert_osis_bibles()
    # s += insert_bible_vers()
    # s += init_strong_grammar()
    return HttpResponse(s)


@login_required
def note(request, booknr, chapternr, versnr):
    text = ''
    if request.method == 'POST':
        form = NoteForm(request.POST)
        if form.is_valid():
            # save note
            note = BibleVersNote.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, vers__versNr=versnr, user=request.user)
            if note.count() <= 0:
                book = BibleBook.objects.filter(nr=booknr)[0]
                vers = BibleVers.objects.filter(versNr=versnr, chapterNr=chapternr, bookNr=book)[0]
                note = BibleVersNote(vers=vers, user=request.user, text=request.POST['note'])
            else:
                note = note[0]
            note.text = form.cleaned_data['note']
            text = note.text
            note.save()
        else:
            # display error
            pass
    else:
        form = NoteForm()

        # retrieve content from db
        note = BibleVersNote.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, vers__versNr=versnr, user=request.user)
        if note.count() > 0:
            text = note[0].text
            form.note = text

    verses1 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[0])
    verses2 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[1])
    verses3 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[2])
    verses4 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[3])
    # return render(request, 'strongs/editorbible.html', {'form': form, 'text': text, 'saveurl':'/note/' + booknr + '/' + chapternr + '/' + versnr + '/', 'vers': versnr, 'search': verses1[0].vers.bookNr.name + ' ' + str(chapternr), 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(verses1, verses2, verses3, verses4)})
    return render(request, 'strongs/bibleNew.html', {'form': form, 'text': text, 'saveurl':'/note/' + booknr + '/' + chapternr + '/' + versnr + '/', 'vers': versnr, 'search': verses1[0].vers.bookNr.name + ' ' + str(chapternr), 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses1': verses1, 'verses2': verses2, 'verses3': verses3, 'verses4': verses4})
