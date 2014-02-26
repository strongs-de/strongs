__author__ = 'mirkohecky'

from models import BibleTranslation, BibleVers, StrongNr, BibleBook
import xml.etree.ElementTree as ElementTree
import re, string


def element_to_string(element):
    s = element.text or ""
    for sub_element in element:
        s += ElementTree.tostring(sub_element)
    s += element.tail
    # s = s.replace('<gr', '<a')
    # s = s.replace('</gr>', '</a>')
    return s

def insert_bible_vers():
    s = 'Start parsing ...<br>'

    ####################################################
    # Insert book names if they does not exist

    # FILE = './GER_SCH1951_STRONG.xml'
    # FILE = './GER_ELB1905_STRONG.xml'
    # FILE = './GER_LUTH1912.xml'
    # FILE = './GER_ILGRDE.xml'
    # FILE = './GER_SCH2000.xml'
    FILE = './GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml'

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
    return str

# def insert_bible_translations():
#     ####################################################
#     # Insert book names if they does not exist

#     s = ''

#     # FILE = './GER_SCH1951_STRONG.xml'
#     FILES = ('./GER_ELB1905_STRONG.xml', './GER_LUTH1912.xml', './GER_ILGRDE.xml', './GER_SCH2000.xml', './GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml')

#     for FILE in FILES:
#         ####################################################
#         # Insert bibles from zefanja xml
#         baum = ElementTree.parse(FILE)
#         root = baum.getroot()
#         identifier = root.findtext('INFORMATION/identifier')
#         language = root.findtext('INFORMATION/language')
#         title = root.findtext('INFORMATION/title')

#         # Ask if this translation does already exist
#         tr = BibleTranslation.objects.filter(identifier=identifier)
#         if tr.count() <= 0:
#             tr = BibleTranslation(identifier=identifier, name=title, language=language)
#             tr.save()
#             s += ' -> created new translation ' + identifier + '.<br>'
#         else:
#             tr = tr[0]

#         # Insert verses
#         for book in root.findall('BIBLEBOOK'):
#             chapterCount = 0

#             # Does this book already exist
#             tb = BibleBook.objects.filter(bookNr=book.get('bnumber'), language='de')
#             if tb.count() <= 0:
#                 tb = BibleBook(bookNr=int(book.get('bnumber')), language='de')
#                 tb.save()
#             else:
#                 tb = tb[0]

#             for chapter in book.findall('CHAPTER'):
#                 chapterCount += 1
#                 versCount = 0
#                 for vers in chapter.findall("VERS"):
#                     versCount += 1
#                     # select vers from db
#                     tv = BibleVers.objects.filter(bibleTranslation=tr, bibleBook=tb, bibleChapter=chapter.get('cnumber'), bibleVers=vers.get('vnumber'))
#                     if tv.count() <= 0:
#                         tv = BibleVers(bibleTranslation=tr, bibleBook=tb, bibleChapter=chapter.get('cnumber'), bibleVers=vers.get('vnumber'), versText=element_to_string(vers))
#                         tv.save()
#                     else:
#                         tv = tv[0]
#             s += ' -> inserted book nr ' + book.get('bnumber') + ' with ' + str(chapterCount)  + ' chapters and ' + str(versCount) + ' verses.<br>'
#     return s


def init_strong_grammar():
    greekStrongVerses = BibleVers.objects.filter(versText__contains='<gr rmac=', translationIdentifier=BibleTranslation.objects.filter(identifier='GNTTR'))
    s = 'initStrongGrammar: ' + str(greekStrongVerses.count()) + ' verses found!'
    for vers in greekStrongVerses:
        # get the vers in another translation
        # trWord = BibleTranslation.objects.filter(identifier='ELB1905STR')
        # trVers = BibleVers.objects.filter(versNr=vers.versNr, chapterNr=vers.chapterNr, bookNr=vers.bookNr, translationIdentifier=trWord)
        regex = re.compile("^.*rmac=\"(.*)\" str=\"(.*)\"", re.MULTILINE)
        if regex is not None:
            found = regex.findall(vers.versText)
            for one in found:
                # find vers in translation
                # regex2 = re.compile("^.*str=\"" + one[1] + "\".*>(.*)<.*", re.MULTILINE)
                # word = ''
                # if regex2 is not None:
                    # found2 = regex2.findall(trVers[0].versText)
                    # Todo: Handle multiple strong numbers in one verse
                    # if len(found2) > 1:
                        # word = ' oder '.join(found2)
                    # elif len(found2) > 0:
                        # word = found2[0]
                strong = StrongNr(strongNr=int(one[1]), book=vers.bookNr, versNr=vers.versNr, chapterNr=vers.chapterNr, grammar=one[0], translationIdentifier=vers.translationIdentifier)
                strong.save()
    return s


def init_bible_books():
    s = ''
    f = open('./bibleBooks_de.txt', 'r')
    bookNr = 0
    for line in f:
        bookNr += 1
        ele = line.split(',')
        if len(ele) >= 2:
            ele = [x.strip() for x in ele]
            bookNames = BibleBook.objects.filter(nr=bookNr, language='de')
            if bookNames.count() > 0:
                bookNames = bookNames[0]
            else:
                bookNames = BibleBook()
            bookNames.nr = bookNr
            bookNames.language = 'de'
            bookNames.name = ele[0]
            s += ele[0] + ' ('
            if len(ele) > 1:
                bookNames.short_name = ele[1]
                s += ele[1]
            s += ')'
            if len(ele) > 2:
                bookNames.alternativeNames = string.join(ele[2:], ',')
                s += ' [' + ele[2] + ']'
            bookNames.save()
            s += '<br>'
    return s