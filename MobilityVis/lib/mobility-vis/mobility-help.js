/// <reference path="../jquery/jcookie-min.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// 
/// ======================================================================================================
/// File: MOBILITY-HELP.js
/// ======================================================================================================
/// <summary>
/// This class controls the help that is displayed when the user opens the visualization for the first 
/// time.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================

var mobility_help = (function () {

    function mobility_help(divId, initialView) {
        /// <summary>
        /// A single data point entity
        /// </summary>
        /// <param name="divId" type="String">Id of the parent contaier</param>
        /// <param name="initialView" type="Object">The reference to the initial visualization</param>

        /// <field name="parentId" type="String">Parent container ID</field>
        this.parentId = divId;
        /// <field name="vis" type="d3.selection">Main SVG </field>
        if (d3.select("svg").empty())
            this.vis = d3.select("#" + divId)
                .append("svg:svg");
        else
            this.vis = d3.select("svg");
        /// <field name="helpLayer" type="d3.selection">Visualisation layer</field>
        this.helpLayer = this.vis.append("g").attr("id", "helpLayer");

        this.helpOn = false;
        this.mode;

        /// <field type="overlayHelpStrings" elementType="String">List of all the strings displayed durig the tutorial in overlay</field>
        this.overlayHelpStrings = [
            "Welcome to the DTU Sensible mobility visualization!",
            "This graph views how you reach|various locations from the location|in the center.",
            "Bigger circles indicate more|popular locations.",
            "Thicker connections indicate|more popular routes.",
            "Click any of the nodes to set|it as central location and display|its details on the right.",
            "The sparklines show the weekly trends|for the top 5 locations.",
            "The calendar shows where you've been.",
            "The exploration mode gives you more|insight into your data, go ahead and try it out,|once you are done here!",
            "The locations are marked on the map. The bigger the circle, the more times you've been there. The brighter, the longer your average visits.",
            "Hover over the location to see all the connections, click to display more details!",
            "The filter menu allows you to view which locations you visited on certain days of week and at certain times of day.",
            "Drag and resize the timeline to change the period of time that is visualized.",
            "This button allows you to go back to the simple mode."
        ];
        /// <field type="mapHelpStrings" elementType="String">List of all the strings displayed durig the tutorial in overlay</field>
        this.mapHelpStrings = [
            "The map shows all the locations|and how you move between them.",
            "The bigger the location, the more|often you are there!|Click them to see more!",
            "You can adjust the displayed time period|by dragging in resizing the timeline.",
            "Pressing the play button will display|the movement animation!",
            "The filters menu will allow you|to display the locations based on days of week|and times of day you visit them.",
            "This button takes you back to the simple mode."
        ];

        
    };

    mobility_help.prototype.startHelpOverlay = function (force) {
        var that = this;       
        this.mode = 0;

        if ($.mlog)
            $.mlog.logEvent("helpOpened");
        
        if ($.jCookie("overlayHelpVisited") != undefined && force != true)
            return;

        this.helpOn = true;
        $.jCookie("overlayHelpVisited", true);

        d3.select("#treeGrp").selectAll("text")
                   .style("opacity", 0);

        this.helpLayer.append("rect")
                    .attr({
                        x: 0,
                        y: 0,
                        width: document.getElementById(this.parentId).offsetWidth,
                        height: document.getElementById(this.parentId).offsetHeight,
                        id: "helpBg",
                    })
                    .style({
                        "opacity": "0.8",
                        "fill": "black"
                    });

        var items = [
            this.helpLayer.append("use")
                .attr("xlink:href", "#treeGrp")
                .style("opacity", 0)
                .style("pointer-events", "none"),
            this.helpLayer.append("use")
                .attr("xlink:href", "#infoLayer")
                .style("opacity", 0)
                .style("pointer-events", "none"),
            this.helpLayer.append("use")
                .attr("xlink:href", "#exploreBtn")
                .style("opacity", 0)
                .style("pointer-events", "none"),
        ];

        var textPositions = [
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2 - 200) + "," +
            (document.getElementById(this.parentId).offsetHeight / 2) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," +
            (document.getElementById(this.parentId).offsetHeight / 4 - 70) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," +
            (document.getElementById(this.parentId).offsetHeight / 4) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," +
            (document.getElementById(this.parentId).offsetHeight / 4 + 60) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," +
            (document.getElementById(this.parentId).offsetHeight / 4 + 110) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth - 580) + "," +
            20 + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth - 580) + "," +
            710 + ")",
            "translate(" +
            20 + "," +
            60 + ")",
        ];



        this.helpLayer.selectAll("text").data(textPositions).enter()
            .append("text")
            .attr({
                transform: function (d) { return d; },
                id: function (d, i) { return "helpTxt" + i; },
                "class": "helpText"
            })
            .selectAll("tspan").data(function (d,i ) { return that.overlayHelpStrings[i].split('|') }).enter()
            .append("tspan")
            .attr("x", 0)
            .attr("dy", 14)
            .text(function (t) { return t; })

        d3.select("#helpTxt5").style("text-anchor", "end");
        d3.select("#helpTxt6").style("text-anchor", "end");

        this.drawCloseButton();


        d3.select("#helpTxt0")
            .transition()
            .duration(500)
            .delay(500)
            .style("opacity", 1)
            .each("end", function () {
                
                d3.select(this)
                    .transition()
                    .duration(500)
                    .delay(1000)
                    .style("opacity", 0)
                    .each("end", function () {                       
                        items[0]
                            .transition()
                            .duration(500)
                            .delay(500)
                            .style("opacity", 0.5);

                        d3.select("#helpTxt1").transition()
                            .duration(500)
                            .delay(500)
                            .style("opacity", 1);

                        d3.select("#helpTxt2").transition()
                           .duration(500)
                           .delay(500)
                           .style("opacity", 1);

                        d3.select("#helpTxt3").transition()
                           .duration(500)
                           .delay(500)
                           .style("opacity", 1);

                        d3.select("#helpTxt4").transition()
                            .duration(500)
                            .delay(500)
                            .style("opacity", 1);

                        items[1]
                            .transition()
                            .duration(500)
                            .delay(3500)
                            .style("opacity", 0.5);

                        d3.select("#helpTxt5").transition()
                            .duration(500)
                            .delay(3500)
                            .style("opacity", 1);

                        d3.select("#helpTxt6").transition()
                            .duration(500)
                            .delay(3500)
                            .style("opacity", 1)
                            .each("end", function () {
                                items[2]
                                    .style("opacity", 0)
                                    .transition()
                                    .duration(500)
                                    .delay(2500)
                                    .style("opacity", 0.5);

                                d3.select("#helpTxt7").transition()
                                    .duration(500)
                                    .delay(2500)
                                    .style("opacity", 1)
                                    .each("end", function() {
                                        d3.select("#closeHelpBtn").select("text")
                                            .text("GOT IT!")
                                            .attr("x", 40);
                                    });

                            });



                    });
            });      
    };

    mobility_help.prototype.startHelpMap = function (force) {
        var that = this;
        this.mode = 1;

        if ($.mlog)
            $.mlog.logEvent("helpOpened");

        if ($.jCookie("mapHelpVisited") != undefined && force != true)
            return;     

        this.helpOn = true;
        $.jCookie("mapHelpVisited", true);

        this.helpLayer.append("rect")
                    .attr({
                        x: 0,
                        y: 0,
                        width: document.getElementById(this.parentId).offsetWidth,
                        height: document.getElementById(this.parentId).offsetHeight,
                        id: "helpBg",
                    })
                    .style({
                        "opacity": "0.8",
                        "fill": "black"
                    });

        
        var items = [
           this.helpLayer.append("use")
               .attr("xlink:href", "#timelineLayer")
               .style("opacity", 0)
                .style("pointer-events", "none"),
           this.helpLayer.append("use")
               .attr("xlink:href", "#filterMenu")
               .style("opacity", 0)
                .style("pointer-events", "none"),
           this.helpLayer.append("use")
               .attr("xlink:href", "#modeMenu")
               .style("opacity", 0)
                .style("pointer-events", "none"),
        ];

        var textPositions = [
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," +
            (document.getElementById(this.parentId).offsetHeight / 4) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth / 2) + "," + 
            (document.getElementById(this.parentId).offsetHeight * 3 / 4) + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth - 150) + "," +
            30  + ")",
            "translate(" +
            (document.getElementById(this.parentId).offsetWidth - 150) + "," +
            540 + ")",
            "translate(" +
            90 + "," +
            180 + ")",
            "translate(" +
            135 + "," +
            25 + ")",
        ];

       

        this.helpLayer.selectAll("text").data(textPositions).enter()
          .append("text")
          .attr({
              transform: function (d) { return d; },
              id: function (d, i) {
                  return "helpTxt" + i;
              },
              "class": "helpText"
          })
          .selectAll("tspan").data(function (d, i) { return that.mapHelpStrings[i].split('|') }).enter()
          .append("tspan")
          .attr("x", 0)
          .attr("dy", 14)
          .text(function (t) { return t; })

        d3.select("#helpTxt2").style("text-anchor", "end");
        d3.select("#helpTxt3").style("text-anchor", "end");

        d3.select("#helpTxt0")
            .transition()
            .duration(500)
            .delay(500)
            .style("opacity", 1);

        d3.select("#helpTxt1")
            .transition()
            .duration(500)
            .delay(500)
            .style("opacity", 1)
            .each("end", function () {
                items[0]
                    .transition()
                    .duration(500)
                    .delay(2500)
                    .style("opacity", 0.8);

                       
                d3.select("#helpTxt2").transition()
                    .duration(500)
                    .delay(2500)
                    .style("opacity", 1);

                d3.select("#helpTxt3").transition()
                    .duration(500)
                    .delay(2500)
                    .style("opacity", 1)
                    .each("end", function () {
                        items[1]
                            .transition()
                            .duration(500)
                            .delay(2500)
                            .style("opacity", 0.8);


                        d3.select("#helpTxt4").transition()
                            .duration(500)
                            .delay(2500)
                            .style("opacity", 1).each("end", function () {
                                items[2]
                                    .transition()
                                    .duration(500)
                                    .delay(2500)
                                    .style("opacity", 0.8);


                                d3.select("#helpTxt5").transition()
                                    .duration(500)
                                    .delay(2500)
                                    .style("opacity", 1);
                            });
                    });
            });

        this.drawCloseButton();

    };


    mobility_help.prototype.drawCloseButton = function () {
        var that = this;
        // Draw the button that closes the help
        var closeButtonGrp = this.helpLayer.append("g")
            .attr("transform", "translate(" +
                (document.getElementById(this.parentId).offsetWidth - 135) + "," +
                (document.getElementById(this.parentId).offsetHeight - 45) +
            ")")
            .attr("id", "closeHelpBtn")
            .attr("class", "button")
            .on("click", function () {
                return that.close();
            })
            .on("mouseover", function () {
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("text").style("fill", null);
            });;


        closeButtonGrp.append("rect")
           .attr({
               x: 0,
               y: 0,
               width: 125,
               height: 35,
               "class": "tile"
           })

        closeButtonGrp.append("text")
           .attr("x", 15)
           .attr("y", 10 + 12)
           .text("SKIP TUTORIAL");

    };

   
    mobility_help.prototype.close = function () {

        d3.select("#treeGrp").selectAll("text")
           .transition()
           .style("opacity", 1);
        if ($.mlog)
            $.mlog.logEvent("helpClosed");

        this.helpLayer.selectAll("*").remove();
        this.helpOn = false;
    };

    mobility_help.prototype.redraw = function () {

        this.helpLayer.select("#helpBg")
                  .attr({
                      width: document.getElementById(this.parentId).offsetWidth,
                      height: document.getElementById(this.parentId).offsetHeight
                  });
        if (this.mode == 0) {
            var textPositions = [
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2 - 200) + "," +
                (document.getElementById(this.parentId).offsetHeight / 2) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight / 4 - 70) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight / 4) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight / 4 + 60) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight / 4 + 110) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth - 580) + "," +
                20 + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth - 580) + "," +
                710 + ")",
                "translate(" +
                20 + "," +
                60 + ")",
            ];

            this.helpLayer.selectAll("text").data(textPositions)
               .attr({
                   transform: function (d) { return d; }
               });
        }
        else if (this.mode == 1) {

            var textPositions = [
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight / 4) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth / 2) + "," +
                (document.getElementById(this.parentId).offsetHeight * 3 / 4) + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth - 150) + "," +
                30 + ")",
                "translate(" +
                (document.getElementById(this.parentId).offsetWidth - 150) + "," +
                540 + ")",
                "translate(" +
                90 + "," +
                180 + ")",
                "translate(" +
                135 + "," +
                25 + ")",
            ];

            this.helpLayer.selectAll("text").data(textPositions)
               .attr({
                   transform: function (d) { return d; }
               });

        }
            
    };

    
    return mobility_help;

})();