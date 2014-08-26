# -*- coding: utf8 -*-
import re

from django.db.models import Q, Max
from django.shortcuts import render

from strongs.models import BibleBook, BibleVers, BibleTranslation, BibleText, BibleVersList, BibleVersNote
from strongs.utils import bible_translation_order, set_cookies
from strongs.views import BIBLES_IN_VIEW, _get_date, BIBLE_NAMES_IN_VIEW, BIBLE_HINTS_IN_VIEW
from strongs.views_search import async_search, sync_search
from strongs.views_strong_details import strongs


__author__ = 'mirkohecky'





def bible(request, bible_book, templateName, column=None, translation=None):
    # if strong-number, then forward
    if bible_book.isdigit():
        return strongs(request, bible_book)

    regex = re.compile(r"([0-9]?\.?\s?[^0-9\s]+)\s?([0-9]+)?,?([0-9]+)?$", re.UNICODE)
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

                        response = render(request, templateName, {'versLists': versLists, 'versListItems': versListItems, 'versList': versList, 'full_url': request.build_absolute_uri(None),'vers': vers, 'search': srch, 'translation1': BIBLE_NAMES_IN_VIEW[bible_order[0]], 'translation2': BIBLE_NAMES_IN_VIEW[bible_order[1]], 'translation3': BIBLE_NAMES_IN_VIEW[bible_order[2]], 'translation4': BIBLE_NAMES_IN_VIEW[bible_order[3]], 'verses1': verses1, 'verses2': verses2, 'verses3': verses3, 'verses4': verses4, 'bible_hint1': BIBLE_HINTS_IN_VIEW[bible_order[0]], 'bible_hint2': BIBLE_HINTS_IN_VIEW[bible_order[1]], 'bible_hint3': BIBLE_HINTS_IN_VIEW[bible_order[2]], 'bible_hint4': BIBLE_HINTS_IN_VIEW[bible_order[3]], 'trOptions': BIBLE_NAMES_IN_VIEW})

                        # handle cookies
                        set_cookies(response, bible_order)

                        return response;

                    else:
                        # return HttpResponse('No verses found')
                        return render(request, 'strongs/error.html', {'search': bible_book, 'message': u'Die Bibelstelle konnte nicht geladen werden!', 'solution':u'Versuche es bitte später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})
                else:
                    # return HttpResponse('No translation found')
                    return render(request, 'strongs/error.html', {'search': bible_book, 'message': u'Die Übersetzungen konnten nicht geladen werden!', 'solution':'Probiere es bitte später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})
            else:
                # Try to search for this word
                return False
        else:
            # Try to search for the string
            return sync_search(request, bible_book, 1)
    else:
        return render(request, 'strongs/error.html', {'search': bible_book, 'message': 'Es ist ein Fehler aufgetreten!', 'solution':u'Bitte probiere es später noch einmal.<br/>Sollte der Fehler noch immer bestehen, gib uns bitte unter info@strongs.de bescheid!'})


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