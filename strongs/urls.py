from django.conf.urls import patterns, url
from strongs import views

urlpatterns = patterns('',
    url(r'^$', views.index, name='index'),
    url(r'^strong/(?P<strong_id>\d+)/(?P<vers>\w+)/$', views.strongs, name='strongs'),
    url(r'^initDb$', views.initDb, name='initDb'),
    url(r'^initStrongGrammar$', views.initStrongGrammar, name='initStrongGrammar'),
    url(r'^(?P<bible_book>.+)/$', views.bible, name='bible'),
)