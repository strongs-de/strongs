# -*- coding: utf-8 -*-
from django.shortcuts import render
from django.http import HttpResponse
from models import BibleBook, BibleTranslation, BibleVers, StrongNr
from django.db.models import Q
from initDb import init_bible_books, insert_bible_vers, init_strong_grammar
import re
import xml.etree.ElementTree as ElementTree
from itertools import izip_longest
from django.db.models import Max
from collections import Counter


# Create your views here.
def index(request):
    return bible(request, 'joh1')

def strongs(request, strong_id, vers):
    search = "<gr str=\"" + str(strong_id) + "\""
    search1 = BibleVers.objects.filter(bookNr=BibleBook.objects.filter(nr__gte=40), versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
    # search1 = StrongNr.objects.filter(strongNr=strong_id)
    if search1.count() > 0:
        vers = vers.replace('_', ',')
        regex = re.compile("([0-9]?.? ?[a-zA-Z]+)\s?([0-9]+)?,?([0-9]+)?")
        if regex is not None:
            v = regex.search(vers)
            if v is not None and len(v.groups()) > 0:
                book = BibleBook.objects.filter(name=v.group(1))
                # bvers = BibleVers.objects.filter(bookNr=book, chapterNr=v.group(2), versNr=v.group(3))
                search2 = StrongNr.objects.filter(book=book, chapterNr=v.group(2), versNr=v.group(3), strongNr=strong_id)
                if search2.count() > 0:
                    vers = vers + ' Grammatik: ' + search2[0].grammar
            regex2 = re.compile("^.*str=\"" + str(strong_id) + "\">([a-zA-Z0-9_-]*)", re.MULTILINE)
            if regex2 is not None:
                translations = []
                for vers in search1:
                    found = regex2.search(vers.versText)
                    if found is not None and found.groups() > 1:
                        translations.append(found.group(1))
                    elif found is not None and found.groups() > 1:
                        translations.append(found.group(0))
                translations = Counter(translations)
            # translations = Counter([vv.word for vv in search1])
                return render(request, 'strongs/strongNr.html', {'verses': search1[0:100], 'vers': vers, 'count': search1.count(), 'translations': translations.iteritems()})
    return HttpResponse('No verses found for strong nr ' + str(strong_id))

    # Try to search for this strong number
    # search = "<gr str=\"" + str(strong_id) + "\""
    # search1 = BibleVers.objects.filter(versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
    # if search1.count() > 0:
    #     return render(request, 'strongs/strongNr.html', {'verses': search1})
    # else:
    #     return HttpResponse('No verses found for strong nr ' + str(strong_id))

def bible(request, bible_book):
    # if strong-number, then forward
    if bible_book.isdigit():
        return strongs(request, bible_book)

    regex = re.compile("([0-9]?.? ?[a-zA-Z]+)\s?([0-9]+)?,?([0-9]+)?")
    if regex is not None:
        s = regex.search(bible_book)
        if s is not None and len(s.groups()) > 0:
            book = BibleBook.objects.filter(Q(name__iexact=s.group(1)) | Q(short_name__iexact=s.group(1)) | Q(alternativeNames__icontains=s.group(1) + ','))
            chapter = s.group(2) or 1
            if book.count() > 0:
                # verify that the chapter is > 1, else select the previous book
                if int(chapter) < 1 and book[0].nr > 1:
                    book = BibleBook.objects.filter(nr=book[0].nr - 1)
                    # get the last chapter for this book
                    chapter = BibleVers.objects.filter(bookNr=book).aggregate(Max('chapterNr'))
                    chapter = chapter['chapterNr__max']
                tr1 = BibleTranslation.objects.filter(identifier='ELB1905STR')
                tr2 = BibleTranslation.objects.filter(identifier='SCH2000NEU')
                tr3 = BibleTranslation.objects.filter(identifier='LUTH1912')
                tr4 = BibleTranslation.objects.filter(identifier='ILGRDE')
                if tr1.count() > 0 and tr2.count() > 0 and tr3.count() > 0 and tr4.count() > 0:
                    verses1 = BibleVers.objects.filter(translationIdentifier=tr1, bookNr=book, chapterNr=chapter)
                    verses2 = BibleVers.objects.filter(translationIdentifier=tr2, bookNr=book, chapterNr=chapter)
                    verses3 = BibleVers.objects.filter(translationIdentifier=tr3, bookNr=book, chapterNr=chapter)
                    verses4 = BibleVers.objects.filter(translationIdentifier=tr4, bookNr=book, chapterNr=chapter)
                    if verses1.count() > 0 and verses2.count() > 0 and verses3.count() > 0:
                        return render(request, 'strongs/bible.html', {'search': book[0].name + ' ' + str(chapter), 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(verses1, verses2, verses3, verses4)})
                    elif book[0].nr < 66:
                        # try the next first chapter
                        book = BibleBook.objects.filter(nr=book[0].nr + 1)
                        chapter = 1
                        verses1 = BibleVers.objects.filter(translationIdentifier=tr1, bookNr=book, chapterNr=chapter)
                        verses2 = BibleVers.objects.filter(translationIdentifier=tr2, bookNr=book, chapterNr=chapter)
                        verses3 = BibleVers.objects.filter(translationIdentifier=tr3, bookNr=book, chapterNr=chapter)
                        verses4 = BibleVers.objects.filter(translationIdentifier=tr4, bookNr=book, chapterNr=chapter)
                        if verses1.count() > 0 and verses2.count() > 0 and verses3.count() > 0:
                            return render(request, 'strongs/bible.html', {'search': book[0].name + ' ' + str(chapter), 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(verses1, verses2, verses3, verses4)})
                        else:
                            return HttpResponse('No verses found')
                else:
                    return HttpResponse('No translation found')
            else:
                # Try to search for this word
                search1 = BibleVers.objects.filter(versText__contains=bible_book, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
                search2 = BibleVers.objects.filter(versText__contains=bible_book, translationIdentifier=BibleTranslation.objects.filter(identifier='SCH2000NEU'))
                search3 = BibleVers.objects.filter(versText__contains=bible_book, translationIdentifier=BibleTranslation.objects.filter(identifier='LUTH1912'))
                search4 = BibleVers.objects.filter(versText__contains=bible_book, translationIdentifier=BibleTranslation.objects.filter(identifier='ILGRDE'))
                if search1.count() > 0:
                    return render(request, 'strongs/search.html', {'search': bible_book, 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(search1, search2, search3, search4)})
                    # return HttpResponse('Found ' + str(search1.count()) + ' verses')
                else:
                    return HttpResponse('No book found for ' + bible_book)
        else:
            return HttpResponse('Keine Bibelstelle oder Strong Nummer eingegeben1!')
    else:
        return HttpResponse('Keine Bibelstelle oder Strong Nummer eingegeben!')

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
    # s += insert_bible_vers()
    s += init_strong_grammar()     # TODO: did not work till the end!
    # s += init_bible_books()
    return HttpResponse(s)