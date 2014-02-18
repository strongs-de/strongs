# -*- coding: utf-8 -*-
from django.shortcuts import render
from django.http import HttpResponse
from models import BibleBook, BibleTranslation, BibleVers
from django.db.models import Q
import re
import xml.etree.ElementTree as ElementTree
from itertools import izip_longest


# Create your views here.
def index(request):
    return bible(request, 'joh1')

def strongs(request, strong_id):
    # Try to search for this strong number
    search = "<gr str=\"" + str(strong_id) + "\""
    search1 = BibleVers.objects.filter(versText__contains=search, translationIdentifier=BibleTranslation.objects.filter(identifier='ELB1905STR'))
    if search1.count() > 0:
        return render(request, 'strongs/strongNr.html', {'verses': search1})
    else:
        return HttpResponse('No verses found for strong nr ' + str(strong_id))

def bible(request, bible_book):
    # if strong-number, then forward
    if bible_book.isdigit():
        return strongs(request, bible_book)

    regex = re.compile("([0-9]?.? ?[a-zA-Z]+)\s?([0-9]+)?,?([0-9]+)?")
    if regex is not None:
        s = regex.search(bible_book)
        if s is not None and len(s.groups()) > 0:
            book = BibleBook.objects.filter(Q(name__iexact=s.group(1)) | Q(alternativeNames__icontains=s.group(1) + ','))
            chapter = s.group(2) or 1
            vers = s.group(3)
            if book.count() > 0:
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
                        return render(request, 'strongs/bible.html', {'search': bible_book, 'translation1': 'Elberfelder 1905 mit Strongs', 'translation2': 'Schlachter 2000', 'translation3': 'Luther 1912', 'translation4': 'Interlinearübersetzung', 'verses': izip_longest(verses1, verses2, verses3, verses4)})
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
    s = 'Start parsing ...<br>'

    ####################################################
    # Insert book names if they does not exist

    # FILE = './GER_SCH1951_STRONG.xml'
    # FILE = './GER_ELB1905_STRONG.xml'
    # FILE = './GER_LUTH1912.xml'
    # FILE = './GER_ILGRDE.xml'
    FILE = './GER_SCH2000.xml'

    ####################################################
    # Insert bibles from zefanja xml
    baum = ElementTree.parse(FILE)
    root = baum.getroot()
    identifier = root.findtext('INFORMATION/identifier')
    language = root.findtext('INFORMATION/language')
    title = root.findtext('INFORMATION/title')

    # Ask if this translation does already exist
    tr = BibleTranslation.objects.filter(identifier=identifier)
    if tr.count() <= 0:
        tr = BibleTranslation(identifier=identifier, name=title, language=language)
        tr.save()
        s += ' -> created new translation ' + identifier + '.<br>'
    else:
        tr = tr[0]

    # Insert verses
    for book in root.findall('BIBLEBOOK'):
        chapterCount = 0

        # Does this book already exist
        tb = BibleBook.objects.filter(nr=book.get('bnumber'))
        if tb.count() <= 0:
            tb = BibleBook(nr=int(book.get('bnumber')), name='', alternativeNames='')
            tb.save()
        else:
            tb = tb[0]

        for chapter in book.findall('CHAPTER'):
            chapterCount += 1
            versCount = 0
            for vers in chapter.findall("VERS"):
                versCount += 1
                dbVers = BibleVers(translationIdentifier=tr, bookNr=tb, chapterNr=chapter.get('cnumber'), versNr=vers.get('vnumber'), versText=element_to_string(vers))
                dbVers.save()
        s += ' -> inserted book nr ' + book.get('bnumber') + ' with ' + str(chapterCount)  + ' chapters and ' + str(versCount) + ' verses.<br>'



    # for node in root.getchildren():
    #     tag_schluessel = node.find("schluessel")
    #     tag_wert = node.find("wert")
    #     d[_lese_text(tag_schluessel)] = _lese_text(tag_wert)


    ####################################################
    ## TISCH WORDS
    # for f in os.listdir('./books'):
    #     if f.endswith('.TSP'):
    #         with open('./books/' + f, 'r') as file:
    #             for line in file:
    #                 arr = line.split(' ')
    #                 tisch = TischWord()
    #
    #                 tisch.book = arr[0]
    #                 psarr = arr[1].split(':')
    #                 tisch.chapter = psarr[0]
    #                 psarr = psarr[1].split('.')
    #                 tisch.verse = psarr[0]
    #                 tisch.word = psarr[1]
    #                 tisch.spelling = arr[3]
    #                 tisch.morphology = arr[5]
    #                 tisch.strong_nr = arr[6]
    #                 tisch.save()
    #         s += f + '<br>'
    ####################################################

    return HttpResponse(s)