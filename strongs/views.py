# -*- coding: utf-8 -*-
from django.shortcuts import render
from django.http import HttpResponse
from models import BibleBook, BibleTranslation, BibleVers, StrongNr
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


# Create your views here.
def index(request):
    return bible(request, 'joh1')


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
            translations.append(f)
            idx = versText.find(search, idx2)
        else:
            break
    return translations


def strongs(request, strong_id, vers):
    vers = vers.replace('_', ',')
    grammar = ''
    regex = re.compile("([0-9]?.? ?[a-zA-Z]+)\s?([0-9]+)?,?([0-9]+)?")
    if regex is not None:
        v = regex.search(vers)
        if v is not None and len(v.groups()) > 0:
            book = BibleBook.objects.filter(short_name=v.group(1))
            search = "<gr str=\"" + str(strong_id) + "\""
            if book.count() > 0:
                if book[0].nr < 40:
                    search1 = BibleVers.objects.filter(bookNr=BibleBook.objects.filter(nr__lt=40), versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
                else:
                    search1 = BibleVers.objects.filter(bookNr=BibleBook.objects.filter(nr__gte=40), versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
                if search1.count() > 0:
                    # bvers = BibleVers.objects.filter(bookNr=book, chapterNr=v.group(2), versNr=v.group(3))
                    if book[0].nr >= 40:
                        search2 = StrongNr.objects.filter(book=book, chapterNr=v.group(2), versNr=v.group(3), strongNr=strong_id)
                        if search2.count() > 0:
                            vers = book[0].name + ' ' + v.group(2) + ',' + v.group(3)
                            grammar = get_grammar_name(search2[0].grammar)


                    translations = []
                    for vers2 in search1:
                        translations = translations + find_translations(strong_id, vers2.versText)
                    occ = len(translations)
                    translations = Counter(translations)
                    translations = sorted(translations.iteritems(), key=operator.itemgetter(1), reverse=True)
                    appender = 'H' if book[0].nr < 40 else 'G'
                    return render(request, 'strongs/strongNr.html', {'strong': appender + str(strong_id), 'verses': search1[0:100], 'grammar': grammar, 'vers': vers, 'occurences': occ, 'count': search1.count(), 'translations': translations})
    return HttpResponse('No verses found for strong nr ' + str(strong_id))


def bible(request, bible_book):
    # if strong-number, then forward
    if bible_book.isdigit():
        return strongs(request, bible_book)

    regex = re.compile(u"([0-9]?.? ?[a-zA-ZäöüÄÖÜ]+)\s?([0-9]+)?,?([0-9]+)?", re.UNICODE)
    if regex is not None:
        s = regex.search(bible_book)
        if s is not None and len(s.groups()) > 0:
            book = BibleBook.objects.filter(Q(name__iexact=s.group(1)) | Q(short_name__iexact=s.group(1)) | Q(alternativeNames__icontains=',' + s.group(1) + ','))
            chapter = s.group(2) or 1
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
                        return render(request, 'strongs/bible.html', {'vers': s.group(3), 'search': book[0].name + ' ' + str(chapter), 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(verses1, verses2, verses3, verses4)})
                    else:
                        return HttpResponse('No verses found')
                else:
                    return HttpResponse('No translation found')
            else:
                # Try to search for this word
                return search(request, bible_book, 1)
        else:
            return HttpResponse('Keine Bibelstelle oder Strong Nummer eingegeben1!')
    else:
        return HttpResponse('Keine Bibelstelle oder Strong Nummer eingegeben!')

def search_strong(request, strong, page='1'):
    nr = int(strong[1:])

    search = "<gr str=\"" + str(nr) + "\""
    if strong[0].upper() == 'H':
        search1 = BibleVers.objects.filter(bookNr=BibleBook.objects.filter(nr__lt=40), versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
    elif strong[0].upper() == 'G':
        search1 = BibleVers.objects.filter(bookNr=BibleBook.objects.filter(nr__gte=40), versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))

    if search1.count() > 0:
        search2, search3, search4 = [], [], []
        count = search1.count()
        
        # only show the first 30 items
        num = 30
        idx1 = num * (int(page) - 1) if int(page) > 0 else 0
        idx2 = num * int(page) if int(page) > 0 else num
        search1 = search1[idx1:idx2]

        for x in search1:
            s2 = BibleVers.objects.filter(translationIdentifier=BibleTranslation.objects.filter(identifier='SCH2000NEU'), bookNr=x.bookNr, versNr=x.versNr, chapterNr=x.chapterNr)
            s3 = BibleVers.objects.filter(translationIdentifier=BibleTranslation.objects.filter(identifier='LUTH1912'), bookNr=x.bookNr, versNr=x.versNr, chapterNr=x.chapterNr)
            s4 = BibleVers.objects.filter(translationIdentifier=BibleTranslation.objects.filter(identifier='ILGRDE'), bookNr=x.bookNr, versNr=x.versNr, chapterNr=x.chapterNr)
            if s2.count() > 0:
                search2.append(s2[0])
            if s3.count() > 0:
                search3.append(s3[0])
            if s4.count() > 0:
                search4.append(s4[0])

        pagecnt = max(1, int(count * 1.0 / num + .5))
        return render(request, 'strongs/search.html', {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': strong, 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(search1, search2, search3, search4)})
    else:
        return HttpResponse('No verses found for strong number ' + strong)


def search(request, search, page):
    searches = search.split(' ')
    searches = map(lambda s: s.decode('UTF8').replace('"', '').replace("'", ''), shlex.split(search.encode('utf8')))
    tag_search = reduce(operator.and_, (Q(versText__contains=x) for x in searches))

    # Try to search for this word
    search1 = BibleVers.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
    search2 = BibleVers.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier='SCH2000NEU'))
    search3 = BibleVers.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier='LUTH1912'))
    search4 = BibleVers.objects.filter(tag_search, translationIdentifier=BibleTranslation.objects.filter(identifier='ILGRDE'))
    if search1.count() > 0 or search2.count() > 0 or search3.count() > 0 or search4.count() > 0:
        # only show the first 200 items
        num = 30
        idx1 = num * (int(page) - 1) if int(page) > 0 else 0
        idx2 = num * int(page) if int(page) > 0 else num
        count = max(search1.count(), search2.count(), search3.count(), search4.count())
        pagecnt = max(1, int(count * 1.0 / num + .5))
        return render(request, 'strongs/search.html', {'count': count, 'pageact': idx2 / num, 'pagecnt': pagecnt, 'search': search, 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(search1[idx1:idx2], search2[idx1:idx2], search3[idx1:idx2], search4[idx1:idx2])})
        # return HttpResponse('Found ' + str(search1.count()) + ' verses')
    else:
        return HttpResponse('No book found for %s' % search)

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
    s += insert_osis_bibles()
    # s += init_strong_grammar()     # TODO: did not work till the end!
    # s += init_bible_books()
    return HttpResponse(s)