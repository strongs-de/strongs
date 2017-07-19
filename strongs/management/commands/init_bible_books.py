# -*- coding: utf8 -*-
import string

from django.core.management.base import BaseCommand

from strongs.models import BibleBook


class Command(BaseCommand):
    help = 'Initializes the database with the bible books found in the file bibleBooks_de.txt.'

    def add_arguments(self, parser):
        return

    def handle(self, *args, **options):
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
                self.stdout.write(ele[0] + ' (', ending='')
                if len(ele) > 1:
                    bookNames.short_name = ele[1]
                    self.stdout.write(ele[1], ending='')
                self.stdout.write(')', ending='')
                if len(ele) > 2:
                    bookNames.alternativeNames = ',' + string.join(ele[2:], ',') + ','
                    # self.stdout.write(' [' + bookNames.alternativeNames.encode('ascii') + ']', ending='')
                self.stdout.write('')
                bookNames.save()