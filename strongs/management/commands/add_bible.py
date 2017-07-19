# -*- coding: iso8859-1 -*-
from itertools import izip_longest
from os import path
from xml.etree import ElementTree as ElementTree
from django.core.management.base import BaseCommand
from strongs.models import BibleTranslation, BibleBook, BibleVers, BibleText
from multiprocessing import Process

class Command(BaseCommand):
    help = 'Adds the given bible translation into the database. You can either choose between OSI format or ZEFANIA XML.'

    def add_arguments(self, parser):
        parser
        return

    def handle(self, *args, **options):
        if len(args) == 0:
            self.stdout.write('You need to give the path to the xml file as an argument to this command!\n    Usage: python manage.py add_bible path_to_xml_file [osis_bible_title] [osis_bible_identifier]')
            return
        xmlfile = args[0]
        if not path.exists(xmlfile):
            self.stdout.write('The path to the xml file you have given does not exist (%s)!\n    Usage: python manage.py add_bible path_to_xml_file [osis_bible_title] [osis_bible_identifier]' % xmlfile)
            return

        xmltree = ElementTree.parse(xmlfile)
        root = xmltree.getroot()
        if root.tag.lower() == 'xmlbible':
            self.stdout.write('Recognized %s as Zefania XML ...' % xmlfile)
            self.insert_zefania_xml(xmltree)
        elif root.tag.lower() == '{http://www.bibletechnologies.net/2003/osis/namespace}osis':
            if len(args) < 2:
                self.stdout.write('Please specify a bible title if you want to insert an Osis Bible!\n    Usage: python manage.py add_bible path_to_xml_file [osis_bible_title] [osis_bible_identifier]' % xmlfile)
                return
            title = args[1]
            identifier = args[2] if len(args) > 2 else None
            self.stdout.write('Recognized %s as Osis XML ...' % xmlfile)
            self.insert_osis_bible(xmltree, title, identifier)
        else:
            self.stdout.write('The path to the xml file you have given is not a Zefania XML bible nor an Osis bible (%s root element %s)!\n    Usage: python manage.py add_bible path_to_xml_file [osis_bible_title] [osis_bible_identifier]' % (xmlfile, root.tag))
            return

    def insert_osis_bible(self, xmltree, title, identifier=None, lang='GER'):
        def __insert(translation, book, chapter, vers, text):
            '''
                Insert the bible text into the database. Create the BibleVers
                and the BibleText if it does not exist.
                    @translation is a BibleTranslation instance
                    @book is a BibleBook instance
                    @chapter and @vers are integers
                    @text is a string
            '''

            # vnumber can contain multiple verses. In NGUE it is seperated by a 8209 (e.g. 16-17 is defined
            # as 16820917. So we have to check if this is the case, then separate the verse numbers, insert the
            # first one and every following as an empty verse.
            numverses = 1
            if str(vers).__contains__('8209'):
                vers, lastvers = int(str(vers).split('8209')[0]), int(str(vers).split('8209')[1])
                numverses = lastvers - vers + 1

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

                if numverses > 1:
                    for i in range(1, numverses):
                        __insert(translation, book, chapter, vers + i, '')


        BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev']
        # FILES = ['./bibles/osis.NGU.xml', './bibles/osis.psalmenNGU.xml', './bibles/osis.schlachter2000.v1.withoutnotes.xml']
        # IDENTIFIER = [u'NGÜ', u'NGÜ', 'SCH2000']
        # LANGS = ['GER', 'GER', 'GER']
        # TITLES = [u'Neue Genfer Übersetzung', u'Neue Genfer Übersetzung', 'Schlachter 2000']
        NEEDS_CHAPTERS = [False, False, True]
        # lists = izip_longest(FILES, IDENTIFIER, LANGS, TITLES, NEEDS_CHAPTERS)
        # for FILE, identifier, lang, title, needs_chapter in lists:
            # FILE = './bibles/osis.schlachter2000.v1.withoutnotes.xml'
            # identifier = 'SCH2000'
            # lang = 'GER'
            # title = 'Schlachter 2000'
            # needs_chapter = True

            # tree = ElementTree.parse(FILE)
        identifier = identifier if identifier is not None else title.replace(' ', '')
        root = xmltree.getroot()
        # work = root.find('{http://www.bibletechnologies.net/2003/OSIS/namespace}osisText/{http://www.bibletechnologies.net/2003/OSIS/namespace}header/{http://www.bibletechnologies.net/2003/OSIS/namespace}work')
        if title is not None and identifier is not None and lang is not None:
            # Ask if this translation does already exist
            tr = BibleTranslation.objects.filter(identifier=identifier)
            if tr.count() <= 0:
                tr = BibleTranslation(identifier=identifier, name=title, language=lang)
                tr.save()
                self.stdout.write(' -> created new translation ' + identifier + '.')
            else:
                tr = tr[0]

            # iterate over all verses
            # if needs_chapter:
            chapters = root.findall('.//{http://www.bibletechnologies.net/2003/OSIS/namespace}chapter')
            # else:
            #     chapters = root.getchildren()
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
                    text = self.element_to_string(vers)

                    if bookname != actbook:
                        # Does this book already exist?
                        bindex = BOOKS.index(bookname)
                        tb = BibleBook.objects.filter(nr=bindex+1)
                        if tb.count() <= 0:
                            tb = BibleBook(nr=bindex+1, name='', alternativeNames='')
                            tb.save()
                        else:
                            tb = tb[0]
                        if actbook != '':
                            self.stdout.write('Created book %s.' % actbook)
                        actbook = bookname

                    # check for existance of the first vers in this chapter,
                    # cause in Schlachter 2000 the first vers isn't encapsulated
                    # in a verse-tag!
                    if cnumber != actchapter:
                        if vnumber > 1:
                            # The first verse can be found in the parent chapter tag-text
                            # __insert(tr, tb, cnumber, 1, chapter.text)
                            __insert(tr, tb, cnumber, 1, self.element_to_string(chapter, ['{http://www.bibletechnologies.net/2003/OSIS/namespace}div', '{http://www.bibletechnologies.net/2003/OSIS/namespace}verse']))
                        actchapter = cnumber

                    __insert(tr, tb, cnumber, vnumber, text)
                    # s += bookname + str(cnumber) + ',' + str(vnumber) + ': ' + text
                    # break

        # return s


    def element_to_string(self, element, until_child_is=None):
        s = element.text or ""
        for sub_element in element:
            if until_child_is != None and sub_element.tag in until_child_is:
                break
            s += ElementTree.tostring(sub_element)
        s += element.tail
        # s = s.replace('<gr', '<a')
        # s = s.replace('</gr>', '</a>')
        return s


    def insert_zefania_xml(self, xmltree):
        def insert_in_db(tb, chapter, tr):
            versCount = 0
            self.stdout.write('.', ending='')
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
                    dbVers = BibleText(translationIdentifier=tr, vers=v, versText=self.element_to_string(vers))
                    dbVers.save()
            
            return versCount

        ####################################################
        # Insert bibles from zefanja xml
        root = xmltree.getroot()
        identifier = root.findtext('INFORMATION/identifier')
        language = root.findtext('INFORMATION/language')
        title = root.findtext('INFORMATION/title')

        self.stdout.write(identifier + ':')

        # Ask if this translation does already exist
        tr = BibleTranslation.objects.filter(identifier=identifier)
        if tr.count() <= 0:
            tr = BibleTranslation(identifier=identifier, name=title, language=language)
            tr.save()
            self.stdout.write(' -> created new translation ' + identifier + '.')
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

            versCount = 0
            for chapter in book.findall('CHAPTER'):
                chapterCount += 1
                versCount += insert_in_db(tb, chapter, tr)
            self.stdout.write(' -> inserted book nr ' + book.get('bnumber') + ' with ' + str(chapterCount)  + ' chapters and ' + str(versCount) + ' verses.')
