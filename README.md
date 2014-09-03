Strongs.de
==========

About
=====
We host the source code of the bible study page www.strongs.de. We want to give it away, cause we want you to contribute and we want to support your ideas and projects that will give people the opportunity to study the word of god.

Until now this site is only available in german. We do have the aim (and we have many other great ideas) to support other languages as well, but this is a question how it is requested by our users.


Quick-Start
===========

>- Install python 2.7.x and django 1.6.x (```pip install Django==1.6```) if you don't have already
- Download the source code
- Go to the main repo directory (the directory with the **manage.py** file in it)
- To get the required database you have two options:

>>1. Download the already generated database file from the releases section of this repository and paste it into the repo directory (where the manage.py file exists).
2. Create the database on your own:

>>>- Execute the syncDb command:
```python manage.py syncDb```
- Start the Website:
```python manage.py runserver```
- Go to http://localhost:8000/initDb. This may take about 1 hour to generate the database
- Note: This generation process will be simplified through prepared databases you can download as release-package

>- To run the server locally run ```python manage.py runserver```


Bible-Licenses
===================
Due to licensing restrictions we are not allowed to include the bible translations for **Schlachter 2000** and **Neue Genfer Übersetzung**. The functionality to import these files is available and we have included it in our live site at www.strongs.de but it is not available nor part of this repo.


License
=======

The code is licensed under CC BY (https://creativecommons.org/licenses/by/4.0/legalcode)
