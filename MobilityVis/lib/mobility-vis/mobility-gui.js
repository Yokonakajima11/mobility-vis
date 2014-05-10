/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-tooltip.js" />

var mobility_gui = (function () {

    function mobility_gui(parenContainer, visRef) {
        /// <summary>
        /// Constructor for the GUI layer
        /// </summary>
        /// <param name="parenContainer">Container (SVG) holding the GUI</param>
        /// <param name="visRef" type="mobility_map">Reference to the visualization</param>

        /*-------------------------------------  References    ---------------------------------------*/
        // <field name="parent" type="d3.selection()">Parent container selection</field>
        this.parent = parenContainer;
        /// <field name="visRef" type="mobility_map">Reference to the main visualization</param>
        this.visRef = visRef;
        // <field name="vis" type="String">Parent container ID of the visualization</field>
        this.parentId = visRef.parentId;
        // <field name="currentTooltip" type="mobility_tooltip">Currently opened details frame</field>
        this.currentTooltip = null;

        /*---------------------------------------  Control    -----------------------------------------*/
        this.menuExpanded = { filters: false, modes: false };
        this.reopen = false;
        this.blocked = false;

        /*----------------------------------------  Data    ------------------------------------------*/
        /// <field name="weekData" type="Array">Data for days of week filter menu</field>
        this.weekData = [{ label: "Monday", clicked: false },
                         { label: "Tuesday", clicked: false },
                         { label: "Wednesday", clicked: false },
                         { label: "Thursday", clicked: false },
                         { label: "Friday", clicked: false },
                         { label: "Saturday", clicked: false },
                         { label: "Sunday", clicked: false }
        ];
        /// <field name="partOfDayData" type="Array">Data for times of day filter menu</field>
        this.partOfDayData = [{ label: "Dusk", clicked: false },
                              { label: "Morning", clicked: false },
                              { label: "Afternoon", clicked: false },
                              { label: "Evening", clicked: false },
                              { label: "Night", clicked: false }
        ];
        /// <field name="colorScale" type="d3.scale">Scale for coloring the scale</field>
        this.colorScale = d3.scale.linear().range([0, 300]).domain([0, 24]).clamp(true);

        /*--------------------------------------  Constructor    -------------------------------------*/
        this.drawCopyright();
        this.drawScale();
        this.drawMenus();

    };
    /*---------------------------------------------------------------------  Scale methods    ---------------------------------------------------------------------*/

    mobility_gui.prototype.drawScale = function () {
    	/// <summary>
    	/// Draw the color scale
    	/// </summary>
        var that = this;
        var scaleGrp = this.parent.append("g")
            .attr("class", "scale")
            .attr("transform", "translate(10," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
            //.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 330) + "," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");

        scaleGrp.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 320)
            .attr("height", 40)
            .attr("class", "tile");

        var gradient = scaleGrp.append("linearGradient")
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("x1", 10)
            .attr("x2", 310)
            .attr("id", "gradient")
            .attr("gradientUnits", "userSpaceOnUse");

        gradient
            .append("stop")
            .attr("offset", "0")
            .attr("stop-color", "#e80c7a");

        gradient
            .append("stop")
            .attr("offset", "0.5")
            .attr("stop-color", "#FFF500");

        scaleGrp
            .append("rect")
            .attr("x", 10)
            .attr("y", 15)
            .attr("width", 300)
            .attr("height", 8)
            .attr("fill", "url(#gradient)");

        var ticks = scaleGrp.selectAll("line").data([0, 24]).enter();
        ticks.append("text").text(function (d) { return d })
            .attr("x", function (d, i) { return that.colorScale(d) + 5 })
            .attr("y", 35)
            .attr("class", "scaleText");
    };

    mobility_gui.prototype.drawScaleTick = function (value) {
    	/// <summary>
    	/// Draw the tick on the color scale
    	/// </summary>
    	/// <param name="value">The value on the scale</param>
        var that = this;
        this.parent.select(".scale").append("polyline")
            .attr("points", "0,5 5,15 10,5")
            .attr("class", "colorScaleTick")
            .attr("transform", "translate(5,0)")
            .style("fill", "#eeeeee")
            .transition().attr("transform", "translate(" + (5 + this.colorScale(value)) + ",0)")

        this.parent.select(".scale").append("text")
        .attr("x", 90)
        .attr("y", 35)
        .attr("class", "colorScaleTick scaleText")
        .text(Math.round(value * 100) / 100 + " hours on average per visit");

    };
    
    mobility_gui.prototype.removeScaleTick = function () {
    	/// <summary>
    	/// Remove the color scale tick
    	/// </summary>
        this.parent.selectAll(".colorScaleTick").remove();
    };

    mobility_gui.prototype.drawMenus = function () {
        var that = this;
        var filterMenu = this.parent.append("g")
            .attr("id", "filterMenu");

        filterMenu.append("rect")
           .attr("x", 0)
           .attr("y", 0)
           .attr("width", 220)
           .attr("height", 150)
           .attr("class", "tile");

        

        var weekButtons = filterMenu.selectAll(".weekButton").data(this.weekData).enter()
            .append("g")
            .attr("class", "weekButton")
            .on("click", function (d, i) {
                that.weekData[i].clicked = !that.weekData[i].clicked;
                if (that.weekData[i].clicked)
                    d3.select(this).select("rect").style("fill", "rgb(232, 12, 122)");
                else
                    d3.select(this).select("rect").style("fill", null);
                that.visRef.updateDayOfWeekFilter(i);
            })
            .on("mouseover", function() {
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function() {
                    d3.select(this).select("text").style("fill", null);
            });

        weekButtons.append("rect")
            .attr("x", 10)
            .attr("y", function (d, i) { return i * 20 + 6; })
            .attr("width", 85)
            .attr("height", 18)
            .attr("class", "tile")

        weekButtons.append("text")
            .attr("x", 20)
            .attr("y", function (d, i) { return (i + 1) * 20 - 2; })
            .style("cursor", "default")
            .text(function (d) { return d.label });

        var PoDButtons = filterMenu.selectAll(".podButton").data(this.partOfDayData).enter()
            .append("g")
            .attr("class", "podButton")
            .on("click", function (d, i) {
                that.partOfDayData[i].clicked = !that.partOfDayData[i].clicked;
                if (that.partOfDayData[i].clicked)
                    d3.select(this).select("rect").style("fill", "rgb(232, 12, 122)");
                else
                    d3.select(this).select("rect").style("fill", null);
                that.visRef.updateTimeofDayFilter(i);
            })
            .on("mouseover", function () {
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                 d3.select(this).select("text").style("fill", null);
            });

        PoDButtons.append("rect")
            .attr("x", 105)
            .attr("y", function (d, i) { return i * 20 + 6; })
            .attr("width", 85)
            .attr("height", 18)
            .attr("class", "tile")

        PoDButtons.append("text")
            .attr("x", 115)
            .attr("y", function (d, i) { return (i + 1) * 20 - 2; })
            .style("cursor", "default")
            .text(function (d) { return d.label });

        var resetButtonGrp = filterMenu.append("g")
            .on("click", function () {
                that.weekData.forEach(function (d, i) {
                    if (d.clicked)
                        that.visRef.updateDayOfWeekFilter(i);
                    d.clicked = false
                });
                that.partOfDayData.forEach(function (d, i) {
                    if (d.clicked)
                        that.visRef.updateTimeofDayFilter(i);
                    d.clicked = false
                });

                d3.selectAll(".weekButton").selectAll("rect").style("fill", null);
                d3.selectAll(".podButton").selectAll("rect").style("fill", null);
            })
            .on("mouseover", function () {
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("text").style("fill", null);
            });;

        resetButtonGrp.append("rect")
           .attr("x", 105)
           .attr("y", 120 + 6)
           .attr("width", 85)
           .attr("height", 18)
           .attr("class", "tile")

        resetButtonGrp.append("text")
            .attr("x", 115)
            .attr("y", 140 - 2)
            .style("cursor", "default")
            .text("Reset");

        var openGrp = filterMenu.append("g")
        .on("click", function () {
            if (!that.menuExpanded.filters && !that.blocked) {
                that.openFilterMenu();
            }
            else {
                that.closeFilterMenu();
            }
        })
        .on("mouseover", function () {
            d3.select(this).select("polyline").style("fill", "#FFFFFF");
            d3.select(this).select("text").style("fill", "#FFFFFF");
        })
        .on("mouseout", function () {
            d3.select(this).select("polyline").style("fill", "#eeeeee");
            d3.select(this).select("text").style("fill", null);
        });;

        openGrp.append("rect")
            .attr("x", 200)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 150)
            .style("opacity", 0);            

        openGrp.append("text")
            .attr("y", 20)
            .selectAll("tspan").data("Filters".split("")).enter()
            .append("tspan")
            .attr("dy", 13)
            .attr("x", 207)
            .text(function (t) { return t; })
            .style("text-anchor", "middle");
        
        openGrp.append("polyline")
           .attr("points", "-5,-5 5,0 -5,5")
           .attr("transform", "translate(210,130) rotate(0)")
           .style("fill", "#eeeeee");

        filterMenu.attr("transform", "translate(-200, 10)");


       

    };

    mobility_gui.prototype.openFilterMenu = function () {
        this.menuExpanded.filters = true;
        d3.select("#filterMenu").select("polyline")
            .attr("transform", "translate(210,130) rotate(180)");
        d3.select("#filterMenu").transition()
            .duration(500)
            .ease("linear")
            .attr("transform", "translate(10,10)");
    };

    mobility_gui.prototype.closeFilterMenu = function () {
        this.menuExpanded.filters = false;
        d3.select("#filterMenu").select("polyline")
            .attr("transform", "translate(210,130) rotate(0)");
        d3.select("#filterMenu").transition()
            .duration(500)
            .ease("elastic")
            .attr("transform", "translate(-200, 10)");
    };

    mobility_gui.prototype.blockGui = function () {
        this.blocked = true;
        if (this.menuExpanded.filters)
            this.reopen = true;
        this.hideDetailFrame();
        this.closeFilterMenu();

        d3.select("#filterMenu").select("polyline")
            .style("visibility", "hidden");

    };

    mobility_gui.prototype.unblockGui = function () {
        this.blocked = false;
        if (this.reopen)
            this.openFilterMenu();
        d3.select("#filterMenu").select("polyline")
          .style("visibility", "visible");

    };

    mobility_gui.prototype.update = function (start, end) {

        this.parent.selectAll(".scale")
            .attr("transform", "translate(20," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
        //.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 330) + "," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");

        this.parent.selectAll(".copyrightBox")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 140) + "," + (document.getElementById(this.parentId).offsetHeight - 25) + ")");

        if (this.currentTooltip != null)
            this.currentTooltip.update(start, end);
    };

    

    mobility_gui.prototype.showDetailFrame = function (data) {
        var that = this;
        var grp = this.parent.append("g")
            .attr("class", "detailFrame")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth / 2 - 200)  + ", " + document.getElementById(this.parentId).offsetHeight + ")");


        grp.transition()
            .duration(500)
            .ease("linear")
        .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth / 2 - 200) + ", 10)");
        var closeFun = function () { that.visRef.hideDetails() };
        this.currentTooltip = new mobility_tooltip(grp, data, document.getElementById(this.parentId).offsetWidth / 2 - 110 + 200,
            550, this.visRef.startTime, this.visRef.endTime, closeFun);
    };

    mobility_gui.prototype.hideDetailFrame = function () {
        var that = this;
        this.parent.select(".detailFrame")
            .transition()
            .duration(500)
            .ease("elastic")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth / 2 - 200) + ", " + document.getElementById(this.parentId).offsetHeight + "0)")
            .remove();

        delete this.currentTooltip;
        //this.currentTooltip = null;

    };

    mobility_gui.prototype.drawCopyright = function () {
        /// <summary>
        /// Draw the copyright box
        /// </summary>
        var copGrp = this.parent.append("g").attr("class", "copyrightBox");

        var text = copGrp
        .append("text")
        .attr("x", 5)
        .attr("y", 10)
        .attr("class", "copyright")
        .style("font-size", "9px");

        text.append("a")
        .attr("xlink:href", "http://www.openstreetmap.org/copyright")
            .append("tspan")
        .text("© OpenStreetMap ");

        text.append("tspan")
        .text("contributors");

        copGrp.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 140) + "," + (document.getElementById(this.parentId).offsetHeight - 25) + ")");
    };


    return mobility_gui;

})();