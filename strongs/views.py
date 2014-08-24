# -*- coding: utf8 -*-
import time

from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from models import BibleBook, BibleVers, BibleText, BibleVersNote
from forms import NoteForm


BIBLES_IN_VIEW = ['ELB1905STR', 'SCH2000', 'LUTH1912', u'NGÜ', 'ILGRDE']
BIBLE_NAMES_IN_VIEW = ['Elberfelder 1905', 'Schlachter 2000', 'Luther 1912', u'Neue Genfer Übersetzung', 'Interlinear']
BIBLE_HINTS_IN_VIEW = ['', '<br/>Bibeltext der Schlachter Übersetzung<br/>Copyright &copy; 2000 Genfer Bibelgesellschaft<br/>Wiedergegeben mit freundlicher Genehmigung. Alle Rechte vorbehalten.<br/>', '', '<br/>Bibeltext der Neuen Genfer Übersetzung – Neues Testament und Psalmen<br/>Copyright &copy; 2011 Genfer Bibelgesellschaft<br/>Wiedergegeben mit freundlicher Genehmigung. Alle Rechte vorbehalten.<br/>', '']


def _get_date():
    return time.strftime('%Y-%m-%d %H-%M-%S', time.localtime())


@login_required
def note(request, booknr, chapternr, versnr):
    text = ''
    if request.method == 'POST':
        form = NoteForm(request.POST)
        if form.is_valid():
            # save note
            note = BibleVersNote.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, vers__versNr=versnr, user=request.user)
            if note.count() <= 0:
                book = BibleBook.objects.filter(nr=booknr)[0]
                vers = BibleVers.objects.filter(versNr=versnr, chapterNr=chapternr, bookNr=book)[0]
                note = BibleVersNote(vers=vers, user=request.user, text=request.POST['note'])
            else:
                note = note[0]
            note.text = form.cleaned_data['note']
            text = note.text
            note.save()
        else:
            # display error
            pass
    else:
        form = NoteForm()

        # retrieve content from db
        note = BibleVersNote.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, vers__versNr=versnr, user=request.user)
        if note.count() > 0:
            text = note[0].text
            form.note = text

    verses1 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[0])
    verses2 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[1])
    verses3 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[2])
    verses4 = BibleText.objects.filter(vers__bookNr__nr=booknr, vers__chapterNr=chapternr, translationIdentifier__identifier=BIBLES_IN_VIEW[3])
    # return render(request, 'strongs/editorbible.html', {'form': form, 'text': text, 'saveurl':'/note/' + booknr + '/' + chapternr + '/' + versnr + '/', 'vers': versnr, 'search': verses1[0].vers.bookNr.name + ' ' + str(chapternr), 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses': izip_longest(verses1, verses2, verses3, verses4)})
    return render(request, 'strongs/bibleNew.html', {'form': form, 'text': text, 'saveurl':'/note/' + booknr + '/' + chapternr + '/' + versnr + '/', 'vers': versnr, 'search': verses1[0].vers.bookNr.name + ' ' + str(chapternr), 'translation1': BIBLE_NAMES_IN_VIEW[0], 'translation2': BIBLE_NAMES_IN_VIEW[1], 'translation3': BIBLE_NAMES_IN_VIEW[2], 'translation4': BIBLE_NAMES_IN_VIEW[3], 'verses1': verses1, 'verses2': verses2, 'verses3': verses3, 'verses4': verses4})
