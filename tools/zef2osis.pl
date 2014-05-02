#!/usr/bin/perl

## Zefania XML to OSIS (2.1.1) converter

## Licensed under the standard BSD license:

# Copyright (c) 2007-2008 CrossWire Bible Society <http://www.crosswire.org/>
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
#        notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright
#       notice, this list of conditions and the following disclaimer in
#       the documentation and/or other materials provided with the
#       distribution.
#     * Neither the name of the CrossWire Bible Society nor the names of
#       its contributors may be used to endorse or promote products
#       derived from this software without specific prior written
#       permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
# IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
# TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
# PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## For general inquiries, comments, suggestions, bug reports, etc. email:
## sword-support@crosswire.org

#########################################################################

$version = "1.1.1";
$osisVersion = "2.1.1";

$date = '$Date$';
$rev = '$Rev$';

$date =~ s/^.+?(\d{4}-\d{2}-\d{2}).+/$1/;
$rev =~ s/^.+?(\d+).+/$1/g;

@OSISbook = (
#OT
 "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",

#NT
"Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev",

#Apocrypha
"Tob", "Jdt", "AddEsth", "Wis", "Sir", "Bar", "EpJer", "PrAzar", "Sus", "Bel", "1Macc", "2Macc", "3Macc", "4Macc", "1Esd", "2Esd", "PrMan", "Ps151", "PssSol", "Odes"
);

if (scalar(@ARGV) < 2) {
    print "zef2osis.pl -- Zefania XML to OSIS $osisVersion converter version $version\nRevision $rev ($date)\nSyntax: zef2osis.pl <osisWork> <input filename> [-o OSIS-file]\n";
    exit (-1);
}

$osisWork = $ARGV[0];

if ($ARGV[2] eq "-o") {
    $outputFilename = "$ARGV[3]";
}
else {
    $outputFilename = "$osisWork.osis.xml";
}
open (OUTF, ">$outputFilename") or die "Could not open file $ARGV[2] for writing.";

($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst)=localtime(time);
$year += 1900;
$mon++;
$date = sprintf("%04d\-%02d\-%02d", $year, $mon, $mday);

open (INF, '<:encoding(UTF-8)', $ARGV[1]);
@data = <INF>;
close (INF);

$book = "";
$chap = "";
$vers = "";

$pr = 0;

sub delempty {
    $iline = @_[1];
    $tag = @_[0];
    $iline =~ s/<$tag[^>]*><\/$tag>//g;
    return $iline;
}

$enc = "utf8";

$q = 0;
$hd_source = "<source>Zefania XML (http:\/\/www.zefania.de)<\/source>\n";
$lang = "";
$hd_title = "<title><\/title>\n";
$hd_description = "<description><\/description>\n";

foreach $line (@data) {
    if ($enc ne "utf8") {
      utf8::encode($line);
    }

    if ($pr == 1) {

	$line =~ s/[\r\n]+/\n/g;
	$line =~ s/^\s+//;
	$line =~ s/\s+$//;
	$line =~ s/¶//g;  #delete pilcrows from OLB modules--they're inserted programmatically, not based on the actual text
	$line =~ s/<(\?|\!--)[^\>]+>//;
	$line =~ s/<\/XMLBIBLE>//;

	$i = 1;
	while ($i > 0) {
	    $line = delempty("NOTE", $line);
	    $line = delempty("DIV", $line);
	    $line = delempty("STYLE", $line);
	    $line = delempty("BIBLEBOOK", $line);
	    $line = delempty("CHAPTER", $line);
	    $line = delempty("VERS", $line);
        $line = delempty("gr", $line);
	    $i--;
	}

	$line =~ s/#FF0000/red/g;

	$line =~ s/<STYLE css=\"color:red\">([^<]+?)<\/STYLE>/<q who="Jesus">$1<\/q>/g;
	$line =~ s/<STYLE css=\"font-style:italic\;color:red\">([^<]+?)<\/STYLE>/<q who="Jesus"><hi type="italic">$1<\/hi><\/q>/g;

	$line =~ s/\;? ?color:\#[0-9a-fA-F]{6}\;?//g;

	$line =~ s/<STYLE css=\"font\-weight:bold\">(.+?)<\/STYLE>/<hi type="bold">$1<\/hi>/g;
	$line =~ s/<STYLE css=\"font\-style:italic\">(.+?)<\/STYLE>/<hi type="italic">$1<\/hi>/g;
	$line =~ s/<STYLE css=\"font\-size: ?x-small\">(.+?)<\/STYLE>/<hi type="x-small">$1<\/hi>/g;

	$line =~ s/<STYLE css=\"color:red\">(.+?)<\/STYLE>/<q who="Jesus">$1<\/q>/g;

	if ($line =~ /<BIBLEBOOK /) {
	    $line =~ s/<BIBLEBOOK .*?bnumber=\"(\d+)\".*?>/<div type="book" osisID="@OSISbook[$1-1]">/;
	    $book = @OSISbook[$1-1];
	}
	if ($line =~ /<CHAPTER /) {
	    $line =~ s/<CHAPTER .*?cnumber=\"(\d+)\".*?>/<chapter osisID="$book.$1">/;
	    $chap = $1;
	}

	$line =~ s/<VERS vnumber=\"0\">(.+?)<\/VERS>/<p>$1<\/p>/g;

	if ($line =~ /<VERS /) {
	    $line =~ s/<VERS .*?vnumber=\"(\d+)\".*?>/<verse osisID="$book.$chap.$1">/;
	    $vers = $1;
	}

	$line =~ s/<\/BIBLEBOOK>/<\/div>/g;
	$line =~ s/<\/CHAPTER>/<\/chapter>/g;
	$line =~ s/<\/VERS>/<\/verse>/g;
	$line =~ s/<(\/?)CAPTION[^>]*>/<$1title>/g;
	$line =~ s/<PROLOG[^>]*>/<div type="introduction">/g;
	$line =~ s/<\/PROLOG>/<\/div>/g;

	$line =~ s/n-studynote/x-studynote/g; #elberfelder hack
	$line =~ s/<DIV><NOTE type="x-studynote"><DIV><NOTE type="x-studynote">(.+?)<\/NOTE><\/DIV><\/NOTE><\/DIV>/<note>$2<\/note>/g;	 #elberfelder hack
	$line =~ s/<DIV><NOTE type="(x-studynote|x-bold)">(.+?)<\/NOTE>([^<]+)<\/DIV>/<note>$2$3<\/note>/g; #elberfelder hack
	$line =~ s/<DIV> <NOTE type="(x-studynote|x-bold)">(.+?)<\/NOTE><\/DIV>/ <note>$2<\/note>/g; #elberfelder hack

	$line =~ s/<DIV><NOTE type="(x-studynote|x-bold)">(.+?)<\/NOTE><\/DIV>/<note>$2<\/note>/g;
	$line =~ s/<DIV><NOTE type="(x-studynote|x-bold)">(.+?)<\/NOTE><\/DIV>/<note>$2<\/note>/g;

    $line =~ s/<gr str="([^"]+)">([^<]+?)<\/gr>/<w gloss="s:$1">$2<\/w>/g;
    $line =~ s/<gr str="([^"]+)" rmac="([^"]+)">(.+?)<\/gr>/<w gloss="s:$1" morph="$2">$3<\/w>/g;

	$line =~ s/ <\/hi>/<\/hi> /g;
    # $line =~ s/ <\/w>/<\/w> /g;

	if ($line !~ /^\s*$/) {
	    print OUTF "$line\n";
	}
    }
    elsif ($line =~ /<\?xml .*?encoding=\"[Ii][Ss][Oo]\-8859\-1\"\?>/) {
	use encoding 'latin1';
	$enc = "latin1";
    }
    elsif ($line =~ /<\/INFORMATION>/) {
	print OUTF "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<osis xmlns=\"http://www.bibletechnologies.net/2003/OSIS/namespace\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.bibletechnologies.net/2003/OSIS/namespace http://www.bibletechnologies.net/osisCore.$osisVersion.xsd\">\n<osisText osisRefWork=\"Bible\" xml:lang=\"$lang\" osisIDWork=\"$osisWork\">\n<header>\n<revisionDesc><date>$date<\/date><p>initial OSIS 2.1.1 version<\/p><\/revisionDesc>\n<work osisWork=\"$osisWork\">\n$hd_title$hd_contributor$hd_creator<creator role=\"encoder\">zef2osis.pl from http:\/\/www.crosswire.org<\/creator>\n<date><\/date>\n$hd_description$hd_publisher<type type=\"OSIS\">Bible<\/type>\n<identifier type=\"OSIS\">$osisWork<\/identifier>\n$hd_source<language type=\"IETF\">$lang<\/language>\n$hd_rights<scope><\/scope>\n<refSystem>Bible<\/refSystem>\n<\/work>\n<\/header>\n";

	$pr = 1;
    }
    else {
	if ($line =~ /(<title>.+?<\/title>)/) {
	    $hd_title = "$1\n";
	}
	elsif ($line =~ /(<creator>.+?<\/creator>)/) {
	    $hd_creator = "$1\n";
	}
	elsif ($line =~ /(<contributors>.+?<\/contributors>)/) {
	    $hd_contributor = "$1\n";
	    $hd_contributor =~ s/contributors/contributor/g;
	}
	elsif ($line =~ /(<description>.+?<\/description>)/) {
	    $hd_description = "$1\n";
	}
	elsif ($line =~ /(<source>.+?<\/source>)/) {
	    $hd_source = $1;
	    $hd_source =~ s/<\/source>/\nvia Zefania XML (http:\/\/www.zefania.de)<\/source>\n/;
	}
	elsif ($line =~ /(<rights>.+?<\/rights>)/) {
	    $hd_rights = "$1\n";
	}
	elsif ($line =~ /(<publisher>.+?<\/publisher>)/) {
	    $hd_publisher = "$1\n";
	}
	elsif ($line =~ /<language>(.+?)<\/language>/) {
	    $lang = $1;
	    if ($lang eq "ENG") {
		$lang = "en";
	    }
	    elsif ($lang eq "GER") {
		$lang = "de";
	    }
	    else {$lang = ""};
	}
    }
}

print OUTF "<\/osisText>\n";
print OUTF "<\/osis>\n";

close (OUTF);
