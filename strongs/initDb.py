# -*- coding: utf-8 -*-
__author__ = 'mirkohecky'

from models import BibleTranslation, BibleVers, StrongNr, BibleBook, BibleText
import xml.etree.ElementTree as ElementTree
import re, string
from itertools import izip_longest


def element_to_string(element):
    s = element.text or ""
    for sub_element in element:
        s += ElementTree.tostring(sub_element)
    s += element.tail
    # s = s.replace('<gr', '<a')
    # s = s.replace('</gr>', '</a>')
    return s


def insert_osis_bibles():
    BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Klgl', 'Isa', 'Jer', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev']
    s = ''
    FILES = ['./bibles/osis.NGU.xml', './bibles/osis.psalmenNGU.xml', './bibles/osis.schlachter2000.v1.withoutnotes.xml']
    IDENTIFIER = [u'NGÜ', u'NGÜ', 'SCH2000']
    LANGS = ['GER', 'GER', 'GER']
    TITLES = [u'Neue Genfer Übersetzung', u'Neue Genfer Übersetzung', 'Schlachter 2000']
    NEEDS_CHAPTERS = [False, False, True]
    lists = izip_longest(FILES, IDENTIFIER, LANGS, TITLES, NEEDS_CHAPTERS)
    for FILE, identifier, lang, title, needs_chapter in lists:
        tree = ElementTree.parse(FILE)
        root = tree.getroot()
        # work = root.find('{http://www.bibletechnologies.net/2003/OSIS/namespace}osisText/{http://www.bibletechnologies.net/2003/OSIS/namespace}header/{http://www.bibletechnologies.net/2003/OSIS/namespace}work')
        if title is not None and FILE is not None and identifier is not None and lang is not None:
            # Ask if this translation does already exist
            tr = BibleTranslation.objects.filter(identifier=identifier)
            if tr.count() <= 0:
                tr = BibleTranslation(identifier=identifier, name=title, language=lang)
                tr.save()
                s += ' -> created new translation ' + identifier + '.<br>'
            else:
                tr = tr[0]

            # iterate over all verses
            if needs_chapter:
                chapters = root.findall('.//{http://www.bibletechnologies.net/2003/OSIS/namespace}chapter')
            else:
                chapters = root.getchildren()
            actbook = ''
            actchapter = 0
            tb = None
            for chapter in chapters:
                versesinchapter = chapter.findall('.//{http://www.bibletechnologies.net/2003/OSIS/namespace}verse')
                for vers in versesinchapter:
                    parts = vers.attrib.get('osisID').split('.')
                    bookname = parts[0]
                    cnumber = int(parts[1])
                    vnumber = int(parts[2])
                    text = element_to_string(vers)

                    if bookname != actbook:
                        # Does this book already exist?
                        bindex = BOOKS.index(bookname)
                        tb = BibleBook.objects.filter(nr=bindex+1)
                        if tb.count() <= 0:
                            tb = BibleBook(nr=bindex+1, name='', alternativeNames='')
                            tb.save()
                        else:
                            tb = tb[0]

                    # check for existance of the first vers in this chapter,
                    # cause in Schlachter 2000 the first vers isn't encapsulated
                    # in a verse-tag!
                    if cnumber != actchapter:
                        if vnumber > 1:
                            # The first verse can be found in the parent chapter tag-text
                            __insert(tr, tb, cnumber, 1, chapter.text)
                        actchapter = cnumber

                    __insert(tr, tb, cnumber, vnumber, text)
                    # s += bookname + str(cnumber) + ',' + str(vnumber) + ': ' + text
                    # break

    return s

def __insert(translation, book, chapter, vers, text):
    '''
        Insert the bible text into the database. Create the BibleVers
        and the BibleText if it does not exist.
            @translation is a BibleTranslation instance
            @book is a BibleBook instance
            @chapter and @vers are integers
            @text is a string
    '''
    # Does this vers already exist?
    v = BibleVers.objects.filter(bookNr=book, chapterNr=chapter, versNr=vers)
    if v.count() <= 0:
        v = BibleVers(bookNr=book, chapterNr=chapter, versNr=vers)
        v.save()
    else:
        v = v[0]

    # Insert text if it does not already exist
    t = BibleText.objects.filter(vers=v, translationIdentifier=translation)
    if t.count() <= 0:
        t = BibleText(vers=v, translationIdentifier=translation, versText=text)
        t.save()


def insert_bible_vers():
    s = 'Start parsing ...<br>'

    ####################################################
    # Insert book names if they does not exist

    # FILES = ['./bibles/GER_SCH1951_STRONG.xml', './bibles/GER_ELB1905_STRONG.xml', './bibles/GER_LUTH1912.xml', './bibles/GER_ILGRDE.xml', './bibles/GER_SCH2000.xml', './bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml', './bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml']
    FILES = ['./bibles/GER_ELB1905_STRONG.xml', './bibles/GER_LUTH1912.xml', './bibles/GER_ILGRDE.xml', './bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml']
    # FILE = './GER_SCH1951_STRONG.xml'
    # FILE = './GER_ELB1905_STRONG.xml'
    # FILE = './GER_LUTH1912.xml'
    # FILE = './GER_ILGRDE.xml'
    # FILE = './GER_SCH2000.xml'
    # FILE = './GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml'

    for FILE in FILES:
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

                    # Does this vers and chapter already exist?
                    v = BibleVers.objects.filter(bookNr=tb, chapterNr=chapter.get('cnumber'), versNr=vers.get('vnumber'))
                    if v.count() <= 0:
                        v = BibleVers(bookNr=tb, chapterNr=chapter.get('cnumber'), versNr=vers.get('vnumber'))
                        v.save()
                    else:
                        v = v[0]

                    # Insert text if it does not already exist
                    dbVers = BibleText.objects.filter(translationIdentifier=tr, vers=v)
                    if dbVers.count() <= 0:
                        dbVers = BibleText(translationIdentifier=tr, vers=v, versText=element_to_string(vers))
                        dbVers.save()
            s += ' -> inserted book nr ' + book.get('bnumber') + ' with ' + str(chapterCount)  + ' chapters and ' + str(versCount) + ' verses.<br>'
    return ''

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
    greekStrongVerses = BibleText.objects.filter(versText__icontains='<gr rmac=', translationIdentifier=BibleTranslation.objects.filter(identifier='GNTTR'))
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
                strong = StrongNr(strongNr=int(one[1]), book=vers.vers.bookNr, versNr=vers.vers.versNr, chapterNr=vers.vers.chapterNr, grammar=one[0], translationIdentifier=vers.translationIdentifier)
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
                bookNames.alternativeNames = ',' + string.join(ele[2:], ',') + ','
                s += ' [' + bookNames.alternativeNames + ']'
            bookNames.save()
            s += '<br>'
    return s