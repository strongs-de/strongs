from django.contrib import admin
from strongs.models import BibleBook, BibleTranslation, BibleVers, StrongNr, BibleVersNote, BibleVersNoteComment, BibleVersList

# Register your models here.
admin.site.register(BibleBook)
admin.site.register(BibleTranslation)
admin.site.register(BibleVers)
admin.site.register(StrongNr)
admin.site.register(BibleVersNote)
admin.site.register(BibleVersNoteComment)
admin.site.register(BibleVersList)