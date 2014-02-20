from django.db import models


class BibleTranslation(models.Model):
    identifier = models.CharField(max_length=20, primary_key=True)      # The bible Identifier
    language = models.CharField(max_length=3)                           # The 3 char language code
    name = models.CharField(max_length=255)                             # The name of the bible

    def __unicode__(self):
        return self.identifier


class BibleBook(models.Model):
    nr = models.IntegerField(primary_key=True)                          # Biblebook Number
    name = models.CharField(max_length=20)                              # The standard name of the book, e.g. 1Mo
    alternativeNames = models.TextField()                               # Alternative names that should be searchable

    def __unicode__(self):
        return self.name


class BibleVers(models.Model):
    translationIdentifier = models.ForeignKey("BibleTranslation")
    bookNr = models.ForeignKey("BibleBook")
    chapterNr = models.IntegerField()
    versNr = models.IntegerField()
    versText = models.TextField()

    def __unicode__(self):
        return str(self.bookNr.__str__()) + ' ' + str(self.chapterNr) + ',' + str(self.versNr)


class StrongNr(models.Model):
    strongNr = models.IntegerField()
    bibleVers = models.ForeignKey("BibleVers")
    grammar = models.CharField(max_length=20)

    def __unicode__(self):
        return str(self.strongNr) + ' = ' + self.grammar + ' in ' + self.bibleVers.__str__()