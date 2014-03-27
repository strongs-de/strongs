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
	return s
