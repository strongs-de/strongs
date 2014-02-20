__author__ = 'mirkohecky'

from django import template
from django.template.defaultfilters import stringfilter


register = template.Library()


@register.filter
@stringfilter
def correctverstext(value):
    return value.replace("<STYLE css=", "<span style=").replace("</STYLE>", "</span>").replace("<gr str=", "<span class='sb-strong' rel='tooltip' title='test' data-placement='top' data-strong=").replace("</gr>", "</span>")
