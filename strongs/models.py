# -*- coding: utf-8 -*-
from django.db import models
from django.contrib.auth.models import User


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


class BibleText(models.Model):
    vers = models.ForeignKey("BibleVers")
    translationIdentifier = models.ForeignKey("BibleTranslation")
    versText = models.TextField(db_index=True)

    def __unicode__(self):
        return self.vers.__unicode__()


class BibleVers(models.Model):
    # translationIdentifier = models.ForeignKey("BibleTranslation")
    bookNr = models.ForeignKey("BibleBook")
    chapterNr = models.IntegerField()
    versNr = models.IntegerField()
    # versText = models.TextField(db_index=True)

    def __unicode__(self):
        return unicode(self.bookNr.short_name) + ' ' + str(self.chapterNr) + ',' + str(self.versNr)


class StrongNr(models.Model):
    '''
    Defines a strong number at a specific bible vers with its underlying grammar and
    its translation. The translation (e.g. into german) is stored in the wordTranslation
    parameter.
    '''
    strongNr = models.IntegerField(db_index=True)
    translationIdentifier = models.ForeignKey("BibleTranslation")
    book = models.ForeignKey("BibleBook")
    versNr = models.IntegerField()
    chapterNr = models.IntegerField()
    grammar = models.CharField(max_length=20)

    def __unicode__(self):
        return str(self.strongNr) + ' = ' + self.grammar + ' in ' + self.book.__str__() + ' ' + str(self.chapterNr) + ',' + str(self.versNr)


class UserData(models.Model):
    user = models.ForeignKey(User, editable=False)
    class Meta:
        abstract = True


class BibleVersNote(UserData):
    vers = models.ForeignKey('BibleVers')
    versList = models.ForeignKey('BibleVersList', null=True)
    text = models.TextField(null=True)
    lastchanged = models.CharField(null=True, max_length="20")

    def __unicode__(self):
        return self.vers.__unicode__() + self.text


class BibleVersList(UserData):
    title = models.CharField(max_length=300)
    lastchanged = models.CharField(null=True, max_length="20")


class BibleVersNoteComment(UserData):
    text = models.TextField()
    lastchanged = models.CharField(null=True, max_length="20")
