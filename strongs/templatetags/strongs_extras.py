__author__ = 'mirkohecky'

from django import template
from django.template.defaultfilters import stringfilter
import re


register = template.Library()


@register.filter
@stringfilter
def correctverstext(value):
    s = value.replace("<STYLE css=", "<span style=")
    s = s.replace("</STYLE>", "</span>")

    # <note n='[3]'>In den</note>
    # ==> <sup><abbr rel='tooltip' title="In den">[3]</abbr></sup>
    s = s.replace('<ns0:catchWord>', '***')
    s = s.replace('</ns0:catchWord>', '+++')
    # Replace doubled hints
    # s = re.sub("<ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note><ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note>", "<sup><abbr class='small' rel='tooltip' title='\\2'>\\1</abbr></sup> ", s)
    s = re.sub("<ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note><ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note>", "<sup class='small tooltip' title='\\2'>\\1</sup> ", s)
    # Replace single hints
    # s = re.sub("<ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note>", "<sup><abbr class='small' rel='tooltip' title='\\2'>\\1</abbr></sup> ", s)
    s = re.sub("<ns0:note xmlns:ns0=['\"]http://www.bibletechnologies.net/2003/OSIS/namespace['\"] n=['\"]\\[([^'\"]*)\\]['\"]>([^<]*)</ns0:note>", "<sup class=\"small tooltip\" title='\\2'>\\1</sup> ", s)
    # Replace hint in zefania xml bibles
    s = re.sub('(?i)<div><note type=[\'"]x-studynote[\'"]>([^<]*)</note></div>', "<sup class='small tooltip' title='\\1'>Hinweis</sup>", s)
    s = s.replace('***', '<b>')
    s = s.replace('+++', '</b>')

    # s = s.replace("<gr str=", "<span class='sb-strong' onclick='' data-strong=")
    s = re.sub("<gr str=\"([^\"]*)\"", "<span class='sb-strong strong-\\1' onclick='' data-strong=\"\\1\"", s)
    s = s.replace("</gr>", "</span>")
    s = s.replace(' </span>,', '</span>,')
    s = s.replace(' </span>.', '</span>.')
    s = s.replace(' </span>!', '</span>!')
    s = s.replace(' </span>?', '</span>?')
    s = s.replace(' </span>:', '</span>:')
    s = s.replace(' </span>;', '</span>;')
    s = s.replace(' </span>]', '</span>]')
    s = s.replace('( ', '(')
    s = s.replace(' )', ')')
    s = s.replace(' </span>)', '</span>)')
    s = s.replace('\n', ' ')
    s = s.replace(',', ', ')
    s = s.replace('.', '. ')
    s = s.replace('!', '! ')
    s = s.replace('?', '? ')
    s = s.replace(':', ': ')
    # s = s.replace(';', '; ') # Problems with umlauts (e.g. '&auml;')
    return s
