# -*- coding: utf8 -*-
from strongs.views_bible import bible, async_bible

__author__ = 'mirkohecky'


def index(request):
    return bible(request, "joh", 'strongs/intro.html')
    # return render(request, 'strongs/intro.html')
    # return render_to_response('strongs/intro.html')


def async_index(request, column=None, translation=None):
    return async_bible(request, 'joh1', column, translation)