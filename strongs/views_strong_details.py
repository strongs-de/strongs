# -*- coding: utf8 -*-
from collections import Counter
import operator
import re
from django.shortcuts import render
from strongs.grammar_parser import get_grammar_name
from strongs.models import BibleBook, BibleText, StrongNr
from strongs.views import BIBLES_IN_VIEW

__author__ = 'mirkohecky'


def strongs(request, strong_id, vers, word):
    '''
    Will be called if a strong number was clicked. This returns only a
    part of the HTML page which will be displayed in the info sidebar.
    '''
    vers = vers.replace('_', ',')
    grammar = None
    greek = None
    pronounciation = None
    regex = re.compile(r"([0-9]?\.?\s?[^0-9\s]+)\s?([0-9]+)?,?([0-9]+)?$", re.UNICODE)
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
    # return render(request, 'strongs/error.html', {'message': u'Es wurden keine Verse für die Strong-Nummer ' + str(strong_id) + ' gefunden!', 'solution':'Evtl. existiert diese Strong Nummer nicht.'})
    return render(request, 'strongs/strongNr.html', {'error': 'Diese Strong-Nummer existiert scheinbar nicht!'})


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