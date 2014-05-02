# import xml.etree.ElementTree as ET
import xml.etree.cElementTree as ET
import sqlite3 as sql
import os
import string
from multiprocessing import Pool
from functools import partial

########################################################################################################################
# C L A S S E S
########################################################################################################################

class Word:
    """
    This class defines a word in a bible. The following informations can be added to a word:
    word -- the word itself in it's translation language
    strong -- the strong number this word is translatet from
    morph -- grammar informations (Robins Morphological Analysis Code)
    src -- the original word in greek or hebrew
    lemma -- the lemma in the translated language
    translit -- the transliteration of the original word (greek or hebrew)
    """
    def __init__(self, word, strong=0, morph='', src='', lemma='', translit=''):
        self.word, self.strong, self.morph, self.src, self.lemma, self.translit = word, strong, morph, src, lemma, translit

    def insert_into_db(self, cursor, translationIdentifier, verseOsisId):
        cursor.execute("insert into strongs_bibleword values(null, ?, ?, ?, ?, ?, ?, ?, ?)", \
                       (verseOsisId, translationIdentifier, self.word, self.strong, self.morph, self.src, self.lemma, self.translit))

    def __str__(self):
        return self.word


class Verse:
    """
    This class defines a bible verse. A bible verse has many words and an osisID.
    """
    def __init__(self, osisID):
        self.osisID = osisID
        self.words = []

    def get_words(self, strongNr):
        found = []
        strongArr = split_no_empty(str(strongNr).replace('G', '').replace('H', ''), '-')
        if len(strongArr) == 1:
            strongArr = split_no_empty(strongArr[0], ' ')
        strongArr = [int(s) for s in strongArr]
        if len(strongArr) > 1:
            pass

        for w in self.words:
            if w.strong in strongArr or int(w.strong) in strongArr:
                if w.strong not in [f.strong for f in found] or\
                   w.morph not in [f.morph for f in found]:   # dont add duplicate words ... they must differ either
                    found.append(w)                           # in the strong number or in the morphology
        return found

    def set_words_from_xml(self, elem):
        words = []
        text = elem.text.strip() or ""
        words += [Word(w) for w in split_no_empty(text)]
        for subelem in elem:
            if subelem.tag == '{http://www.bibletechnologies.net/2003/OSIS/namespace}w':
                strong = subelem.attrib['gloss'][2:]
                morph = subelem.get('morph') or ''
                w = Word(subelem.text.strip(), strong, morph)
                words.append(w)
            if subelem.tail:
                text = subelem.tail.strip()
                words += [Word(w) for w in split_no_empty(text)]
        self.words = words

    def insert_into_db(self, cursor, translationIdentifier):
        for word in self.words:
            word.insert_into_db(cursor, translationIdentifier, self.osisID)

    def __str__(self):
        return self.osisID


class Chapter:
    """
    This class defines a bible chapter. A bible chapter has many bible verses and an osisID.
    """
    def __init__(self, osisID):
        self.osisID = osisID
        self.verses = []

    def insert_into_db(self, cursor, translationIdentifier):
        for verse in self.verses:
            verse.insert_into_db(cursor, translationIdentifier)

    def __str__(self):
        return self.osisID


class Book:
    """
    This class defines a bible book. A bible book has many bible chapters and an osisID.
    """
    def __init__(self, osisID):
        self.osisID = osisID
        self.chapters = []

    def insert_into_db(self, cursor, translationIdentifier):
        for chapter in self.chapters:
            chapter.insert_into_db(cursor, translationIdentifier)

    def __str__(self):
        return self.osisID



class Bible:
    """
    This class defines a bible. A bible has many bible books, an osisWork identifier, a title and a language code (3 chars).
    """
    def __init__(self, path, greek_bible = None, strongs_array = None):
        self.books = {}
        xmlpre = '{http://www.bibletechnologies.net/2003/OSIS/namespace}'
        tr = ET.parse(path)
        self.osisWork = tr.getroot().find(xmlpre + 'osisText').get('osisIDWork')
        self.title = tr.getroot().find(xmlpre + string.join(['osisText', 'header', 'work', 'title'], '/' + xmlpre)).text
        self.language = tr.getroot().find(xmlpre + string.join(['osisText', 'header', 'work', 'language'], '/' + xmlpre)).text
        for book in tr.getroot().findall(xmlpre + string.join(['osisText', 'div'], '/' + xmlpre)):
            b = None
            if book.attrib['type'] == 'book':
                b = Book(book.attrib['osisID'])
                self.books[book.attrib['osisID']] = b
            else:
                continue
            for chapter in book.findall('.//' + xmlpre + 'chapter'):
                c = Chapter(chapter.attrib['osisID'])
                b.chapters.append(c)
                for verse in chapter.findall(xmlpre + 'verse'):
                    v = Verse(verse.attrib['osisID'])
                    c.verses.append(v)
                    v.set_words_from_xml(verse)
                    # if book_keys.index(b.osisID.split('.')[0]) >= 39 and greek_bible and strongs_array:
                    #     greekVerse = greek_bible.get_verse(v.osisID)
                    #     if greekVerse:
                    #         for word in v.words:
                    #             grWords = greekVerse.get_words(word.strong)
                    #             for grWord in grWords:
                    #                 word.src += grWord.word + ' '
                    #                 word.morph += grWords[0].morph + ' '
                    #                 if strongs.has_key(int(grWord.strong)):
                    #                     word.translit += strongs[int(grWord.strong)].translit + ' '

    def get_verse(self, osisID):
        book, chapter, verse = osisID.split('.')
        if self.books.has_key(book) and len(self.books[book].chapters) >= int(chapter) and len(self.books[book].chapters[int(chapter) - 1].verses) >= int(verse):
            return self.books[book].chapters[int(chapter) - 1].verses[int(verse) - 1]
        else:
            return None

    def export_to_db(self, sqlite_path):
        conn = sql.connect(sqlite_path)
        c = conn.cursor()
        self._create_tables(c)
        self._clear_data(c)
        self._insert(c)
        conn.commit()

    def _insert(self, cursor):
        cursor.execute("insert into strongs_bibletranslation values(?, ?, ?)", (self.osisWork, self.language, self.title))
        for _, book in self.books.iteritems():
            book.insert_into_db(cursor, self.osisWork)


    def _clear_data(self, cursor):
        cursor.execute('delete from strongs_biblebook')
        cursor.execute("delete from strongs_bibleword where translationidentifier_id like '" + self.osisWork + "'")
        cursor.execute("delete from strongs_bibletranslation where identifier like '" + self.osisWork + "'")

    def _create_tables(self, cursor):
        cursor.execute('create table if not exists strongs_bibletranslation (identifier varchar(20) primary key, language varchar(3), name varchar(255))')
        cursor.execute('create table if not exists strongs_biblebook (number integer primary key, name varchar(20), short_name varchar(10), alternativeNames text, language varchar(3))')
        # cursor.execute('create table if not exists strongs_biblevers (id integer primary key, bookNr integer, chapterNr integer, versNumber integer)')
        # cursor.execute('create table if not exists strongs_bibletext (id integer primary key, vers_id integer, translationIdentifier_id integer, versText text)')
        cursor.execute('create table if not exists strongs_bibleword (id integer primary key autoincrement, vers_osis_id varchar(20), translationIdentifier_id varchar(20), word varchar(1024), strong varchar(255), morph varchar(1024), src varchar(1024), lemma varchar(1024), translit varchar(1024))')


    def lemmatize(self):
        conn = sql.connect('lemma.db')
        c = conn.cursor()
        for _, book in self.books.iteritems():
            for chapter in book.chapters:
                for verse in chapter.verses:
                    for word in verse.words:
                        select = "select * from strongs_lemma where word_id in (select id from strongs_word where word  like '" + word.word.upper() + "')"
                        c.execute(select)
                        rows = c.fetchall()
                        for row in rows:
                            lemma = row[2]
                            self.lemma = lemma
                            break

    def __str__(self):
        return self.osisWork


class StrongNr:
    """
    This class defines a strong number and its informations (transliteration and english description).
    """
    def __init__(self, strongNr=0, translit='', description=''):
        self.strongNr, self.translit, self.description = strongNr, translit, description

########################################################################################################################
# S T A T I C    V A R S
########################################################################################################################


book_keys = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
             "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev"]


########################################################################################################################
# S T A T I C    F U N C T I O N S
########################################################################################################################


def fill_lemma_db():
    '''
    Create a lemma db with all german words
    '''
    os.remove('lemma.db') if os.path.exists('lemma.db') else None
    conn = sql.connect('lemma.db')
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS strongs_word (id INTEGER PRIMARY KEY AUTOINCREMENT, word VARCHAR(1024))')
    c.execute('CREATE TABLE IF NOT EXISTS strongs_lemma (id INTEGER PRIMARY KEY AUTOINCREMENT, word_id INTEGER, lemma VARCHAR(1024), wkl VARCHAR(128), kas VARCHAR(128), num VARCHAR(128), gen VARCHAR(128))')
    conn.commit()

    # load lemma file (it's about 700MB!!
    lemma = ET.parse('morphy-export-20110722.xml')

    # insert lemma in db
    wordid = 0
    lemmaid = 0
    for item in lemma.getroot().getchildren():
        if item.tag == 'item':
            form = item.find('form').text
            wordid += 1
            c.execute("INSERT INTO strongs_word VALUES (" + str(wordid) + ", '" + form + "')")
            # print 'Word ' + form
            lemmas = item.findall('lemma')
            for lemma in lemmas:
                wkl = lemma.attrib['wkl']
                kas = lemma.attrib['wkl']
                num = lemma.attrib['wkl']
                gen = lemma.attrib['wkl']
                word = lemma.text
                lemmaid += 1
                c.execute("INSERT INTO strongs_lemma VALUES (" + str(lemmaid) + ", " + str(wordid) + ", '" + word + "', '" + wkl + "', '" + kas + "', '" + num + "', '" + gen + "')")
                # print '   Lemma ' + word + ' (wkl=' + wkl + ', kas=' + kas + ', num=' + num + ', gen=' + gen + ')'
    conn.commit()


def split_no_empty(s, delim=' '):
    return [x for x in s.split(delim) if x]


def get_strong_nrs():
    strong_nrs = {}
    sg = ET.parse('../strongsgreek.xml')
    entries = sg.findall(".//entries/entry")
    for e in entries:
        sn = StrongNr(int(e.get("strongs")))
        translit = e.find("./greek")
        if translit != None:
            sn.translit = translit.get("translit")
        desc = e.find('./strongs_def')
        if desc != None:
            sn.description = desc.text
        strong_nrs[sn.strongNr] = sn
    return strong_nrs


def complement_osis_bibles(greek_bible, strongs, osis_bible):
    '''
    Complement the existing strong bible translations with the greek word, transliteration and
    lemma information
    '''
    for bookKey, book in osis_bible.books.iteritems():
        if book_keys.index(bookKey) >= 39:
            for chapter in book.chapters:
                for verse in chapter.verses:
                    greekVerse = greek_bible.get_verse(verse.osisID)
                    if greekVerse:
                        for word in verse.words:
                            grWords = greekVerse.get_words(word.strong)
                            # if len(grWords) > 0:
                            for grWord in grWords:
                                word.src += grWord.word + ' '
                                word.morph += grWords[0].morph + ' '
                                if strongs.has_key(int(grWord.strong)):
                                    word.translit += strongs[int(grWord.strong)].translit + ' '


# fill_lemma_db()
strongs = get_strong_nrs()
sch = None
# sch = Bible('../bibles/converted/SCH1951STR.osis.xml')
tr = Bible('../bibles/converted/GNTTR.osis.xml')
elb = Bible('../bibles/converted/ELB1905STR.osis.xml', tr, strongs)

elb.lemmatize()

# pool = Pool(8)
# comp = partial(complement_osis_bibles, greek_bible=tr, strongs=strongs)
# pool.map(comp, [elb, sch])

# complement_osis_bibles(tr, strongs, elb)
# complement_osis_bibles(tr, strongs, sch)

if elb is not None:
    elb.export_to_db('test.db')
if sch is not None:
    sch.export_to_db('test.db')
if tr is not None:
    tr.export_to_db('test.db')
