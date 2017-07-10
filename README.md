Strongs.de
==========

About
=====
We host the source code of the bible study page www.strongs.de. We want to give it away, cause we want you to contribute and we want to support your ideas and projects that will give people the opportunity to study the word of god.

Until now this site is only available in german. We do have the aim (and we have many other great ideas) to support other languages as well, but this is a question how it is requested by our users.


Prerequisits
============

- Docker

Quick-Start
===========

- Clone this repo: `git clone https://github.com/strongs-de/strongs`
- Create a file `.env` in the source directory to set the docker-compose varaibles:
```
CONTAINER_NAME_DB=strongs_de_db
CONTAINER_NAME_WEB=strongs_de_web
URL=your.url
```
- Create the docker image: `docker-compose build`
- Run initialization steps (only once):
  - `docker-compose run web python manage.py syncdb`
  - `docker-compose run web python manage.py initdatabase`
- Run the project: `docker-compose up -d`
- Now you can visit the page at [http://localhost:8000/](http://localhost:8000/)

How to contribute
=================
If you want to contribute, you're welcome! To start developing, create a fork of this repository. Then you can make your extension or bug fix and create a pull request. After I've reviewed your changes, I will integrate them into the main repository and make it public!
If you want to know more about the fork and pull-request development you can read this [article from github](https://guides.github.com/introduction/flow/index.html) itself.

There are some features we wish to add in the future. If you want to pick one - do it!

- Extend the layout into a stunning responsive one (especially for mobile)
- Add multi-language support
- Add possibility to comment your verse-lists
- Add possibility to comment single verses (internally create a 1-verse verselist and allow to comment it). This should not be shown in the verslist combo.

Bible-Licenses
===================
Due to licensing restrictions we are not allowed to include the bible translations for **Schlachter 2000** and **Neue Genfer Übersetzung**. The functionality to import these files is available and we have included it in our live site at www.strongs.de but it is not available nor part of this repo.


License
=======

The code is licensed under CC BY (https://creativecommons.org/licenses/by/4.0/legalcode)
