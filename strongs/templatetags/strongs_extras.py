__author__ = 'mirkohecky'

from django import template
from django.template.defaultfilters import stringfilter


register = template.Library()


@register.filter
@stringfilter
def correctverstext(value):
	s = value.replace("<STYLE css=", "<span style=")
	s = s.replace("</STYLE>", "</span>")
	s = s.replace("<gr str=", "<span class='sb-strong' onclick='' rel='tooltip' title='test' data-placement='top' data-strong=")
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
