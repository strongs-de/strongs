/**
* jquery.matchHeight.js v0.5.0
* http://brm.io/jquery-match-height/
* License: MIT
*/

(function($) {

    $.fn.matchHeight = function(byRow, variant2) {
        if (this.length <= 1)
            return this;

        // byRow default to true
        byRow = (typeof byRow !== 'undefined') ? byRow : true;

        // keep track of this group so we can re-apply later on load and resize events
        $.fn.matchHeight._groups.push({
            elements: this,
            byRow: byRow,
            variant2: variant2
        });

        // match each element's height to the tallest element in the selection
        $.fn.matchHeight._apply(this, byRow, variant2);

        return this;
    };

    $.fn.matchHeight._apply = function(elements, byRow, variant2) {
        var $elements = $(elements),
            rows = [$elements];

        // get rows if using byRow, otherwise assume one row
        if (byRow) {

            // must first force an arbitrary equal height so floating elements break evenly
            $elements.css({
                'display': 'block',
                'padding-top': '0',
                'padding-bottom': '0',
                'border-top': '0',
                'border-bottom': '0',
                'height': '100px'
            });

            // get the array of rows (based on element top position)
            if(variant2)
                rows = _rows2($elements);
            else
                rows = _rows($elements);

            // revert the temporary forced style
            $elements.css({
                'display': '',
                'padding-top': '',
                'padding-bottom': '',
                'border-top': '',
                'border-bottom': '',
                'height': ''
            });
        }

        $.each(rows, function(key, row) {
            var $row = $(row),
                maxHeight = 0,
                yPos = 0;

            // iterate the row and find the max height
            $row.each(function(){
                var $that = $(this);

                // ensure we get the correct actual height (and not a previously set height value)
                $that.css({ 'display': 'block', 'height': '' });

                // find the max height (including padding, but not margin)
                if ($that.outerHeight(false) > maxHeight) {
                    maxHeight = $that.outerHeight(false);
                    yPos = $that.offset().top;
                }
            });

            // iterate the row and apply the height to all elements
            $row.each(function(){
                var $that = $(this),
                    verticalPadding = 0;

                // handle padding and border correctly (required when not using border-box)
                if ($that.css('box-sizing') !== 'border-box') {
                    verticalPadding += parseInt($that.css('border-top-width'), 10) + parseInt($that.css('border-bottom-width'), 10);
                    verticalPadding += parseInt($that.css('padding-top'), 10) + parseInt($that.css('padding-bottom'), 10);
                }

                // set the height (accounting for padding and border)
                $that.css('height', maxHeight - verticalPadding);

                // set the padding if the yPos differs
                if($that.offset().top < yPos)
                    $that.css('margin-top', yPos - $that.offset().top);
            });
        });

        return this;
    };

    /*
    *  _applyDataApi will apply matchHeight to all elements with a data-match-height attribute
    */
   
    $.fn.matchHeight._applyDataApi = function() {
        var groups = {};

        // generate groups by their groupId set by elements using data-match-height
        $('[data-match-height], [data-mh]').each(function() {
            var $this = $(this),
                groupId = $this.attr('data-match-height');
            if (groupId in groups) {
                groups[groupId] = groups[groupId].add($this);
            } else {
                groups[groupId] = $this;
            }
        });

        // apply matchHeight to each group
        $.each(groups, function() {
            this.matchHeight(true);
        });
    };

    /* 
    *  _update function will re-apply matchHeight to all groups with the correct options
    */
   
    $.fn.matchHeight._groups = [];

    $.fn.matchHeight._update = function() {
        $.each($.fn.matchHeight._groups, function() {
            $.fn.matchHeight._apply(this.elements, this.byRow, this.variant2);
        });
    };

    /* 
    *  bind events
    */

    // apply on DOM ready event
    $($.fn.matchHeight._applyDataApi);

    // update heights on load and resize events
    
    $(window).bind('load resize orientationchange', $.fn.matchHeight._update);

    /**
     * Return an array of rows. A row are all elements with the same id.
     *
     * @param elements
     * @private
     */
    var _rows = function(elements) {
        var rows = [],
            $elements = $(elements);

        $elements.each(function() {
            var that = $(this);
            if(rows.length == 0) {
                rows.push(that);
            } else {
                var id = that.attr('id'),
                    added = false;
                for(i = 0; i < rows.length; ++i) {
                    if(rows[i].attr('id') === id) {
                        rows[i] = rows[i].add(that);
                        added = true;
                        break;
                    }
                }
                if(!added) {
                    rows.push(that);
                }
            }
        });
        return rows;
    }

    /*
    *  rows utility function
    *  returns array of jQuery selections representing each row 
    *  (as displayed after float wrapping applied by browser)
    */

    var _rows2 = function(elements) {
        var tolerance = 1,
            $elements = $(elements),
            lastTop = null,
            rows = [];

        // group elements by their top position
        $elements.each(function(){
            var $that = $(this),
                top = $that.offset().top - parseInt($that.css('margin-top'), 10),
                lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

            if (lastRow === null) {
                // first item on the row, so just push it
                rows.push($that);
            } else {
                // check every item in rows for a row with the same top
                // only if no row could be found, add it as a new row
                var added = false;
                for(i = 0; i < rows.length; ++i) {
                    if (Math.floor(Math.abs((rows[i].offset().top - parseInt($that.css('margin-top'), 10)) - top)) <= tolerance) {
                        rows[i] = rows[i].add($that);
                        added = true;
                        break;
                    }
                }
                if(!added) {
                    // otherwise start a new row group
                    rows.push($that);
                }
            }

            // keep track of the last row top
            lastTop = top;
        });

        return rows;
    };

})(jQuery);
