/**
 * Created by mirkohecky on 09.04.14.
 */
var books = ['1.Mose', '2.Mose', '3.Mose', '4.Mose', '5.Mose', 'Josua', 'Richter', 'Ruth', '1.Samuel', '2.Samuel',
             '1.Könige', '2.Könige', '1.Chronik', '2.Chronik', 'Esra', 'Nehemia', 'Esther', 'Hiob', 'Psalmen', 'Sprüche',
             'Prediger', 'Hohelied', 'Jesaja', 'Jeremia', 'Klagelieder', 'Hesekiel', 'Daniel', 'Hosea', 'Joeal', 'Amos',
             'Obadja', 'Jona', 'Micha', 'Nahum', 'Habakuk', 'Zefanja', 'Haggai', 'Sacharja', 'Maleachi',
             'Matthäus', 'Markus', 'Lukas', 'Johannes', 'Apostelgeschichte', 'Römer', '1.Korinther', '2.Korinther',
             'Galater', 'Epheser', 'Philipper', 'Kolosser', '1.Thessalonicher', '2.Thessalonicher', '1.Timotheus',
             '2.Timotheus', 'Titus', 'Philemon', 'Hebräer', 'Jakobus', '1.Petrus', '2.Petrus', '1.Johannes', '2.Johannes',
             '3.Johannes', 'Judas', 'Offenbarung'];

var strBooks = ",1.Mose,1Mos,Genesis,Gen,1Mo,1.Mo,1.Mos,Mo,Mos,Mose,\n\
,2.Mose,2Mos,Exodus,Ex,2Mo,2.Mo,2.Mos,\n\
,3.Mose,3Mos,Levitikus,Lev,3Mo,3.Mo,3.Mos,\n\
,4.Mose,4Mos,Numeri,Num,4Mo,4.Mo,4.Mos,\n\
,5.Mose,5Mos,Deuteronomium,Dtn,5Mo,5.Mo,5.Mos,\n\
,Josua,Jos,\n\
,Richter,Ri,\n\
,Rut,Rut,\n\
,1.Samuel,1Sam,1.Sam,Sam,Samuel,\n\
,2.Samuel,2Sam,2.Sam,\n\
,1.Könige,1Kön,1Kö,1.Kö,1.Kön,Kö,Kön,Könige,\n\
,2.Könige,2Kön,2Kö,2.Kö,2.Kön,\n\
,1.Chronik,1Chr,1.Chr,Chr,Chronik,\n\
,2.Chronik,2Chr,2.Chr,\n\
,Esra,Esra,\n\
,Nehemia,Neh,\n\
,Esther,Ester,Est,\n\
,Hiob,Hi,Ijob,Job,\n\
,Psalmen,Ps,\n\
,Sprüche,Spr,\n\
,Prediger,Pred,Kohelet,Koh,\n\
,Hoheslied,Hld,Hohes Lied,\n\
,Jesaja,Jes,\n\
,Jeremia,Jer,\n\
,Klagelieder,Klgl,Klag,\n\
,Hesekiel,Hes,Ezechiel,Ez,\n\
,Daniel,Dan,\n\
,Hosea,Hos,\n\
,Joel,Joel,\n\
,Amos,Am,\n\
,Obadja,Obd,\n\
,Jona,Jona,\n\
,Micha,Mi,\n\
,Nahum,Nah,\n\
,Habakuk,Hab,\n\
,Zefanja,Zef,\n\
,Haggai,Hag,\n\
,Sacharja,Sach,\n\
,Maleachi,Mal,\n\
,Matthäus,Mt,\n\
,Markus,Mk,\n\
,Lukas,Lk,\n\
,Johannes,Joh,\n\
,Apostelgeschichte,Apg,\n\
,Römer,Röm,\n\
,1.Korinther,1Kor,1.Kor,Kor,Korinther,\n\
,2.Korinther,2Kor,2.Kor,\n\
,Galater,Gal,\n\
,Epheser,Eph,\n\
,Philipper,Phil,\n\
,Kolosser,Kol,\n\
,1.Thessalonicher,1Thess,1.Thess,Thess,Thessalonicher,1.Th,1Th,\n\
,2.Thessalonicher,2Thess,2.Thess,2Th,2.Th,\n\
,1.Timotheus,1Tim,Timotheus,1.Tim,\n\
,2.Timotheus,2Tim,2.Tim,\n\
,Titus,Tit,\n\
,Philemon,Phlm,\n\
,Hebräer,Hebr,Heb,\n\
,Jakobus,Jak,\n\
,1.Petrus,1Petr,1.Petr,1.Pet,1.Pe,1Pet,1Pe,Pe,Pet,Petr,Petrus,\n\
,2.Petrus,2Petr,2.Petr,2.Pet,2.Pe,2Pet,2Pe,\n\
,1.Johannes,1Joh,1.Joh,1Jo,\n\
,2.Johannes,2Joh,2.Joh,2Jo,\n\
,3.Johannes,3Joh,3.Joh,3Jo,\n\
,Judas,Jud,\n\
,Offenbarung,Offb,";

var arrBooks = strBooks.split("\n");

$(function() {
//    $('#searchId').autocomplete({source: books});
//    return;
    $('#searchId').autocomplete({select: function(event, ui) {
        // trigger the search action
        doSearch(ui.item.value);
    }, source: function(request, response) {
        var found = false;
        try {
            var text = request.term;
            regex = new RegExp("([0-9]?.? ?[a-zA-ZäöüÄÖÜ]+)\\s?([0-9]+)?,?([0-9]+)?", "gi");
            result = regex.exec(text);
            if(result != null) {
                var book = result[1];
                var chapter = result[2];
                var vers = result[3];
                var idx = -1;
                var results = []
                for(i = 0; i < arrBooks.length; ++i) {
                    if(arrBooks[i].toLowerCase().indexOf("," + book.toLowerCase()) > -1) {
                        results.push(books[i] + (chapter != null ? " " + chapter + (vers != null ? "," + vers : ''): ''));
                    }
                }
                response(results);
                found = true;
            }
        } catch(e) {
        }
        if(!found)
            response("");
    }});
});