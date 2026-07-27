# -*- coding: utf8 -*-
import string
import re
from xml.etree import ElementTree as ElementTree
from django.core.management.base import BaseCommand
from strongs.models import BibleTranslation, BibleBook, BibleVers, BibleText, StrongNr
from progressbar import print_progress


class Command(BaseCommand):
    help = 'Initializes strong grammar in database.'

    def add_arguments(self, parser):
        return

    def handle(self, *args, **options):
        greekStrongVerses = BibleText.objects.filter(versText__icontains='<gr rmac=', translationIdentifier=BibleTranslation.objects.filter(identifier='GNTTR'))
        sgreek = ElementTree.parse("./strongsgreek.xml").getroot()
        entries = sgreek.findall(".//entries/entry")

        # Create a dictionary of strong numbers
        strongdict = {}
        for onegreek in entries:
            strongdict[int(onegreek.get('strongs'))] = onegreek

        count = 0
        for vers in greekStrongVerses:
            # get the vers in another translation
            # trWord = BibleTranslation.objects.filter(identifier='ELB1905STR')
            # trVers = BibleVers.objects.filter(versNr=vers.versNr, chapterNr=vers.chapterNr, bookNr=vers.bookNr, translationIdentifier=trWord)
            regex = re.compile("^.*rmac=\"([^\"]*)\" str=\"([^\"]*)\">([^<]*)<", re.MULTILINE)
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
                    bvers = BibleVers.objects.filter(bookNr=vers.vers.bookNr, versNr=vers.vers.versNr, chapterNr=vers.vers.chapterNr)
                    if bvers.count() > 0:
                        if int(one[1]) in strongdict:
                            translit = strongdict[int(one[1])].find('./greek').get('translit')
                            strong = StrongNr(pronounciation=translit, strongNr=int(one[1]), grammar=one[0], translationIdentifier=vers.translationIdentifier, greek=one[2], vers=bvers[0])
                            try:
                                strong.save()
                            except Exception as exc:
                                self.stdout.write(str(exc))
            count += 1
            print_progress(count, greekStrongVerses.count())