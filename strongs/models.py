# -*- coding: utf-8 -*-
from django.db import models


class BibleTranslation(models.Model):
    identifier = models.CharField(max_length=20, primary_key=True)      # The bible Identifier
    language = models.CharField(max_length=3)                           # The 3 char language code
    name = models.CharField(max_length=255)                             # The name of the bible

    def __unicode__(self):
        return self.identifier


class BibleBook(models.Model):
    nr = models.IntegerField(primary_key=True)                          # Biblebook Number
    name = models.CharField(max_length=20)                              # The standard name of the book, e.g. 1.Mose
    short_name = models.CharField(max_length=10)                        # The short name of the book, e.g. 1Mo
    alternativeNames = models.TextField()                               # Alternative names that should be searchable
    language = models.CharField(max_length=3)                           # Language key

    def __unicode__(self):
        # return self.name + unicode(' (') + self.short_name + unicode('), [') + self.alternativeNames + unicode(']')
        return self.name + ' (' + self.short_name + '), [' + self.alternativeNames + ']'
        # return self.name


class BibleVers(models.Model):
    translationIdentifier = models.ForeignKey("BibleTranslation")
    bookNr = models.ForeignKey("BibleBook")
    chapterNr = models.IntegerField()
    versNr = models.IntegerField()
    versText = models.TextField(db_index=True)

    def __unicode__(self):
        return unicode(self.bookNr.short_name) + ' ' + str(self.chapterNr) + ',' + str(self.versNr)


class StrongNr(models.Model):
    '''
    Defines a strong number at a specific bible vers with its underlying grammar and
    its translation. The translation (e.g. into german) is stored in the wordTranslation
    parameter.
    '''
    strongNr = models.IntegerField(db_index=True)
    bibleVers = models.ForeignKey("BibleVers")
    grammar = models.CharField(max_length=20)
    word = models.TextField()
    wordTranslation = models.ForeignKey('BibleTranslation')

    def __unicode__(self):
        return str(self.strongNr) + ' = ' + self.grammar + ' in ' + self.bibleVers.__str__()