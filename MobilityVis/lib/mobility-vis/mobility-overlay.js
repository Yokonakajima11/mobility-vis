/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// <reference path="mobility-gui.js" />
/// <reference path="mobility-datastore.js" />
///
/// ======================================================================================================
/// File: MOBILITY-OVERLAY.js
/// ======================================================================================================
/// <summary>
/// This class is the "simple mode" visualization for the mobility visualization. It operates the 
/// overlay.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================

var mobility_overlay = (function () {

    function mobility_overlay(divId, dataStore) {
    	/// <summary>
    	/// The constructor for the mobility_overlay object.
        /// </summary>
        /// <param name="divId" type="String">Id of the parent contaier</param>
        /// <param name="dataStore" type="mobility_datastore">The reference to the data store</param>
        var chart = this;

        // <field name="parentId" type="String">Parent container ID</field>
        this.parentId = divId;
        /// <field name="vis" type="d3.selection">Main SVG </field>
        if (d3.select("svg").empty())
            this.vis = d3.select("#" + divId)
                .append("svg:svg");
        else
            this.vis = d3.select("svg");        

        /*----------------------------------------  Data    ------------------------------------------*/
        /// <field name="data" type="Object">Object containing all data </field>
        this.data = {
            /// <field type="Array" elementType="mobility_point">List of all unique locations </field>
            location: [],
            /// <field type="Array">List of all visits by time </field>
            time: [],
            /// <field type="Object">Distionary matching ids to map points </field>
            locDict: {},
            /// <field type="Array">List of all unique connections </field>
            connections: []              
        };
        /// <field name="currentCenterId" type="Number">Id of the data point in the middle of the tree</field>
        this.currentCenterId;
        /// <field name="tree" type="d3.layout.tree">The tree layout</field>
        this.tree = null;
        /// <field name=graphData" type="Object">The data for the tree graph</field>
        this.graphData = null;

        /*---------------------------------------  References    --------------------------------------*/
        /// <field name="dataStore" type="mobility_datastore">Reference to data storage</field>
        this.dataStore = dataStore;
        /// <field name="mapRef" type="mobility_map">Reference to big map visualization</field>
        this.mapRef = null;
        /// <field name="helpRef" type="mobility_help">Reference to the help</field>
        this.helpRef = null;

        /*--------------------------------------  Layout    ------------------------------------------*/
        /// <field name="calendarPos" type="Number">Current translation of the calendar</field>
        this.calendarPos = 0;
        /// <field name="colorScale" type="d3.scale">The color scale for the top 5 locations</field>
        this.colorScale = d3.scale.ordinal().range(["#E80C7A", "#9AD954", "#8047C3", "#FF9A54", "#FFE73D"]);
        //this.colorScale = d3.scale.ordinal().range(["#C9313D", "#F9722E", "#CDD452", "#375D81", "#183152"]);
        /// <field name="linkScale" type="d3.scale">The scale for thickness of links</field>
        this.linkScale = d3.scale.linear().range([1, 5]).domain([5, 50]).clamp(true);       
        /// <field name="diameter" type="Number">The diameter of the tree graph</field>
        this.diameter = 800;

        /// <field name="extraColor" type="String">The extra color of the selected point</field>
        this.extraColor = "cyan";
        /// <field name="radiusScale" type="d3.scale">The radius scale for the tree circles</field>
        this.radiusScale = d3.scale.pow().exponent(0.3).range([3, 10]);
        /// <field name="dayBarWidth" type="Number">The width of a single day in the calendar</field>
        this.dayBarWidth = 2.75;
        /// <field name="calendarViewHeight" type="Number">The height of the calendar</field>
        this.calendarViewHeight = 235;
        
        /// <field name="diagonal" type="d3.svg.diagonal">The diagonal for the tree layout</field>
        this.diagonal = d3.svg.diagonal.radial()
            .projection(function (d) {
                return [d.y, d.x / 180 * Math.PI];
            });

        /// <field name="visLayer" type="d3.selection">Visualisation layer</field>
        this.visLayer = null;
        /// <field name="infoLayer" type="d3.selection">The info layer, containg the box with calendar and sparklines</field>
        this.infoLayer = null;

        this.tip = d3.tip()
            .attr('class', 'd3-tip-timeline')
            .offset([0, 15])
            .direction('e')
            .html(function (d) {
                return d.point.locationName;
            })

        /*--------------------------------------  Constructor    -------------------------------------*/
        this.visLayer = this.vis.append("g").attr("id", "overlayLayer");
        // Draw the background
        this.visLayer.append("rect")
                    .attr({
                        x: 0,
                        y: 0,
                        width: document.getElementById(this.parentId).offsetWidth,
                        height: document.getElementById(this.parentId).offsetHeight,
                        id: "background",
                    }).style("fill","#ccc");

        this.infoLayer = this.visLayer.append("g")
            .attr("id", "infoLayer")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 570) + ",10)");

        addEventListener("noData", function (e) {

            chart.visLayer.append("text")
                .attr({
                    x: 20,
                    y: 20,
                })
                .text("No data available!");
        });

        addEventListener("dataReady", function (e) {
            if ($.mlog)
                $.mlog.logEvent("overlayOpened");

            //Data has been loaded - initialize
            chart.data = dataStore.data; 
            chart.graphData = chart.dataStore.makeGraph();
            chart.dataStore.bucketData(function (d) { return true });

            var domain = [];
            for(var i = 0; i<5 && i<chart.data.location.length; i++)
                domain.push(chart.data.location[i].id);

            chart.currentCenterId = chart.data.location[0].id;

            chart.colorScale.domain(domain);
            chart.radiusScale.domain(
                d3.extent(chart.data.location, function(f){return f.count}));

            chart.drawAll();
        });

        addEventListener("pointLocDataUpdated", function() {
            chart.updateLabels();
        })
    };

    
    mobility_overlay.prototype.drawAll = function () {
    	/// <summary>
    	/// Draw the whole overlay
    	/// </summary>
        var chart = this;
        //Draw the box on the right
        this.infoLayer.append("rect")
            .attr({
                x: 0,
                y: 0,
                width: 560,
                height: 750,
                id: "infoBg",
                "class": "tile"        
            });

        this.infoLayer.append("text")//.attr("class", "darkText")
           .attr({
               x: 200,
               y: 30
           })
           .text("Top 5 Locations")
           .style("font-size", "24");

        // Draw the button that closes the overlay
        var closeButtonGrp = this.visLayer.append("g")
            .attr("transform", "translate(10,10)")
            .attr("id", "exploreBtn")
            .attr("class", "button")
            .on("click", function () {
                return chart.closeOverlay();
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
           .attr("x", 10)
           .attr("y", 10 + 12)
           .text("Exploration mode");

        // Draw the help button
        var helpButtonGrp = this.visLayer.append("g")
            .attr("transform", "translate(145,10)")
            .attr("id", "helpMapBtn")
            .attr("class", "button")
            .on("click", function () {
                return chart.helpRef.startHelpOverlay(true);
            })
            .on("mouseover", function () {
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("text").style("fill", null);
            });;


        helpButtonGrp.append("rect")
           .attr({
               x: 0,
               y: 0,
               width: 35,
               height: 35,
               "class": "tile"
           })

        helpButtonGrp.append("text")
           .attr("x", 15)
           .attr("y", 10 + 12)
           .text("?");


        this.drawTree();
        this.drawCalendar();
        this.drawInfo();
        this.drawCopyright();
    };

    mobility_overlay.prototype.updateLabels = function () {
    	/// <summary>
    	/// Update text labels if a point data was loaded asynchronously 
        /// </summary>
        var chart = this;
        this.visLayer.selectAll(".node")
            .selectAll("text")           
            .text(function (d) {
                return d.point.locationName.substr(0, 7) + (((d.point.locationName.length) > 7) ? "..." : "");
            });

        this.visLayer.select(".info").remove();

        this.drawInfo();
    };

    /*-------------------------------------------  Tree methods    ------------------------------------*/
    mobility_overlay.prototype.drawTree = function () {
    	/// <summary>
    	/// Draw the tree graph.
    	/// </summary>
        var chart = this;
        
        var scale = Math.min(document.getElementById(this.parentId).offsetWidth / 1300, document.getElementById(this.parentId).offsetHeight / 740);
        if (scale < 1) scale = 1;

        this.tree = d3.layout.tree()
            .size([360, this.diameter / 2 - 120])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });      

        var svg = this.visLayer
            .append("g")
            .attr("transform", "translate(" + ((this.diameter / 2) * scale) + "," + ((this.diameter / 2) * scale) + ") scale(" + scale + ")")
            .attr("id", "treeGrp");
        svg.call(this.tip);
        this.visLayer.append("text")
            .text("Connected locations")
            .attr({
                id: "treeTxt",
                transform: "translate(" + ((this.diameter / 2) * scale - 10*7) + ",40)"
            })
            .style({
                "font-size": "24px",
                "fill": "#333"
            });

        var nodes = this.tree.nodes(this.graphData),
            links = this.tree.links(nodes);

        var link = svg.append("g").attr("id", "linkGrp").selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", this.diagonal)
            .style("stroke-width", function (d) {
                return chart.linkScale(d.target.strengthToParent);

            });

        var node = svg.selectAll(".node")
            .data(nodes, function (d) { return d.point.id; })
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
            .on("mouseover", function (d) {
                return chart.tip.show(d);
                return d3.select(this).select("text")
                    .text(d.point.locationName)
                    .style("font-weight", "bold")
                    .style("fill", "white");

            })
            .on("mouseout", function (d) {
                return chart.tip.hide();
                return d3.select(this).select("text")
                    .text(d.point.locationName.substr(0, 7) + (((d.point.locationName.length) > 7) ? "..." : ""))
                    .style("font-weight", "normal")
                    .style("fill", null);

            });

        node.append("circle")
            .attr("r", function (d) {
                return chart.radiusScale(d.point.count);
            })
            .attr("id", function(d) {
                return "treePoint_" + d.point.id;
            })
            .on("click", function (d) {
                chart.updateTree(d);
            })
            .style("fill", function (d) {
                if (chart.colorScale.domain().indexOf(d.point.id) != -1)
                    return chart.colorScale(d.point.id);
                else
                    return null;                
            })
            .style("cursor", "pointer");

        node.append("text")
            .attr("dy", ".31em")
            .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function (d) { return d.x < 180 ? "translate(12)" : "rotate(180)translate(-8)"; })
            .style("pointer-events", "none")
            .attr("class","darkText")
            .text(function (d) {
                return d.point.locationName.substr(0, 7) + (((d.point.locationName.length) > 7) ? "..." : "");
            })
    };

    mobility_overlay.prototype.updateTree = function (aNode) {
    	/// <summary>
    	/// Update the tree graph changing the node in the middle.
    	/// </summary>
    	/// <param name="aNode" type="Object">The tree node containing the new middle node</param>
        this.graphData = this.dataStore.makeGraph(aNode.point);
        this.dataStore.bucketData(function (d) { return true });
        this.currentCenterId = aNode.point.id;
        var chart = this;

        if ($.mlog)
            $.mlog.logEvent("treeEvent");

        var diagonal = d3.svg.diagonal.radial()
            .projection(function (d) { return [d.y, d.x / 180 * Math.PI]; });

        var nodes = this.tree.nodes(this.graphData),
            links = this.tree.links(nodes);

        this.visLayer.selectAll(".link").remove();
        this.visLayer.selectAll(".node").selectAll("text").remove();

        
        var redrawn = false;
        var node = this.visLayer.select("#treeGrp").selectAll(".node")
            .data(nodes, function (d) {
                return d.point.id;
            })
            .transition()
            .duration(1000)
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            })
            .each("end", function () {
                if (!redrawn) {
                    var link = chart.visLayer.select("#linkGrp").selectAll(".link")
                        .data(links)
                        .enter().append("path")
                        .attr("class", "link")
                        .attr("d", chart.diagonal)
                        .style("stroke-width", function (d) {
                            return chart.linkScale(d.target.strengthToParent);

                        });;

                    chart.visLayer.select("#treeGrp").selectAll(".node").append("text").attr("class", "darkText")
                        .attr("dy", ".31em")
                        .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
                        .attr("transform", function (d) { return d.x < 180 ? "translate(12)" : "rotate(180)translate(-8)"; })
                        .style("pointer-events", "none")
                        .text(function (d) {
                            return d.point.locationName.substr(0, 7) + (((d.point.locationName.length) > 7) ? "..." : "");
                        })
                    redrawn = true;
                }
            });

        node.selectAll("circle")
            .style("fill", function (d) {
                if (chart.colorScale.domain().indexOf(d.point.id) != -1) 
                    return chart.colorScale(d.point.id);                
                else if (d.point.id == chart.currentCenterId)
                    return chart.extraColor;
                else
                    return null;
            })
        this.addToCalendar(aNode);
        this.addToInfo(aNode);
    };

    /*-----------------------------------------  Calendar methods    ----------------------------------*/
    mobility_overlay.prototype.drawCalendar = function () {
    	/// <summary>
    	/// Draw the calendar visualization.
    	/// </summary>
        var that = this;
        var DoW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        var arrowShape = "M -7.5,0 L0,15 L7.5,0 L0,0";

        var startWeek = (new Date(this.dataStore.startTime)).getWeek();
        var startYear = (new Date(this.dataStore.startTime)).getFullYear();
        var endYear = (new Date(this.dataStore.endTime)).getFullYear();
        var endWeek = (new Date(this.dataStore.endTime)).getWeek();
        var endMonth = (new Date(this.dataStore.endTime)).getMonth();

        // The last days of the year could be part of week 1 of next year
        if (endMonth == 11 && endWeek == 1)
            endWeek = 53;

        // Minimum and maximum vertical translation of the calendar - for scrolling
        var endPos = 50 - (((endYear - 1) - startYear + 1) * 52 * 15 + (endWeek + 2) * 15) + this.calendarViewHeight;
        var startPos = 50 - (startWeek) * 15;

        this.calendarPos = endPos;//0;//endPos;

        var bigGrp = this.infoLayer.append("g")
            .attr({
                id: "calendarVis",
                transform: "translate(70, 450)"
            })

        bigGrp.append("text")//.attr("class", "darkText")
           .attr({
               x: -62,
               y: 20
           })
           .text("Weekly visits")
           .style("font-size", "20");

        // Establish the clip mask
        var clipMask = bigGrp.append("defs").append("clipPath")
            .attr("id", "calClip")
            .append("rect")
            .attr({
                x: -100,
                y: 50,
                width: 7 * 24 * this.dayBarWidth + 100,
                height: this.calendarViewHeight
            });

        var calGrp = bigGrp.append("g")
            .attr("clip-path", "url(#calClip)")
            .append("g")
            .attr({
                id: "calGrp",
                "transform": "translate(0," + this.calendarPos + ")"
            })
            .on("mousewheel", function () {
                if ($.mlog)
                    $.mlog.logEvent("calendarEvent");
                that.calendarPos += d3.event.wheelDelta;
                if (d3.event.wheelDelta < 0)
                    d3.select("#upScroll").style("visibility", "visible");
                else
                    d3.select("#downScroll").style("visibility", "visible");
            
                if (that.calendarPos < endPos) {
                    d3.select("#downScroll").style("visibility", "hidden");
                    that.calendarPos = endPos;
                }
                else if (that.calendarPos > startPos) {
                    d3.select("#upScroll").style("visibility", "hidden");
                    that.calendarPos = startPos;
                }
                d3.select(this).transition()
                    .attr("transform", "translate(0," + that.calendarPos + ")");
            });

        

        calGrp.append("rect")
            .attr({
                x: 0,
                y: startWeek * 15,
                width: 7 * 24 * this.dayBarWidth,
                height: (((endYear - 1) - startYear + 1) * 52 * 15 + (endWeek+1) * 15) - startWeek * 15,
                "class": "tile"
            });

        rectGrp = calGrp.append("g").attr("id", "points");

        for (var i = 0; i < 5 && i < this.data.location.length; i++) {
            var dayGrps = rectGrp.selectAll(".stuff")
                .data(this.data.location[i].hourData).enter()
                .append("rect")
                .attr({
                    x: 0,
                    y: 0,
                    height: 14,
                    width: this.dayBarWidth,
                    "class": "hourTick",
                    transform: function (d, i) {
                        var dDate = new Date(d.timestamp);
                        var dWeek = dDate.getWeek();
                        var dMonth = dDate.getMonth();
                        var dYear = dDate.getFullYear();
                        if (dWeek == 1 && dMonth == 11)
                            dWeek = 53;
                        var dDoW = (dDate.getDay() + 6) % 7;
                        var dHour = dDate.getHours();

                        return "translate(" + (that.dayBarWidth * (24 * dDoW + dHour)) + ","
                            + ((dYear - startYear) * 52 + dWeek) * 15 + ")";
                    },
                    id: function (d, i) {
                        var dDate = new Date(d.timestamp);
                        var dWeek = dDate.getWeek();
                        var dMonth = dDate.getMonth();
                        var dYear = dDate.getFullYear();
                        if (dWeek == 1 && dMonth == 11)
                            dWeek = 53;
                        var dDoW = (dDate.getDay() + 6) % 7;
                        var dHour = dDate.getHours();

                        return "ID_" + dDate.getDate() + "_" + dWeek + "_" + dMonth + "_" + dYear + "__" + dHour;
                    }
                })
                .style("fill", this.colorScale(this.data.location[i].id));
        }       

        bigGrp.selectAll(".dow").data(DoW).enter().append("g")
            .append("text")//.attr("class", "darkText")
            .attr({
                x: function (d, i) { return (24 * i * that.dayBarWidth) + 10 },
                y: 40
            })
            .text(function (d) { return d })
            .style("font-size", "11px");

        // The extra things on the calendar - week labels and lines
        var extraGrp = calGrp.append("g").attr("id", "extra");

        extraGrp.selectAll(".weekLabel").data(d3.time.mondays(this.dataStore.startTime - 1000 * 60 * 60 * 24 * 7,
            this.dataStore.endTime)).enter()
            .append("text")//.attr("class", "darkText")
            .attr({
                x: 10,
                y: 0,
                transform: function (d) {
                    var dWeek = d.getWeek();
                    var dMonth = d.getMonth();
                    var dYear = d.getFullYear();
                    if (dWeek == 1 && dMonth == 11)
                        dWeek = 53;
                    return "translate(-65," +  ((((dYear - startYear) * 52 + dWeek) * 15) + 13) + ")";
                }
            })
            .text(function (d) { return d3.time.format("%d %b %y")(d); })
            .style("font-size", "10px");
       
        extraGrp.selectAll("line").data([1, 2, 3, 4, 5, 6]).enter()
            .append("line")
            .attr({
                x1: function (d) { return d * 24 * that.dayBarWidth; },
                x2: function (d) { return d * 24 * that.dayBarWidth; },
                y1: startWeek * 15,
                y2: (((endYear - 1) - startYear + 1) * 52 * 15 + (endWeek + 1) * 15)
            })
            .style("stroke", "white")
            .style("stroke-width", "2px");
            
        // Buttons to scroll the calendar, if mousewheel won't work
        var buttons = [
            {
                rotate: 180,
                id: "upScroll",
                fun: function () {
                    if ($.mlog)
                        $.mlog.logEvent("calendarEvent");
                    that.calendarPos += 60;
                    d3.select("#downScroll").style("visibility", "visible");
                    if (that.calendarPos < endPos) {
                        that.calendarPos = endPos;
                    }
                    else if (that.calendarPos > startPos) {
                        d3.select("#upScroll").style("visibility", "hidden");
                        that.calendarPos = startPos;
                    }
                    d3.select("#calGrp").transition()
                        .attr("transform", "translate(0," + that.calendarPos + ")");
                }
            },
            {
                rotate: 0,
                id: "downScroll",
                fun: function () {
                    if ($.mlog)
                        $.mlog.logEvent("calendarEvent");
                    that.calendarPos -= 60;
                    d3.select("#upScroll").style("visibility", "visible");
                    if (that.calendarPos < endPos) {
                        d3.select("#downScroll").style("visibility", "hidden");
                        that.calendarPos = endPos;
                    }
                    else if (that.calendarPos > startPos) {
                        that.calendarPos = startPos;
                    }
                    d3.select("#calGrp").transition()
                        .attr("transform", "translate(0," + that.calendarPos + ")");
                }
            }];

        bigGrp.selectAll(".timelineButton").data(buttons).enter()
            .append("path")
            .attr({
                d: arrowShape,
                id: function (d) { return d.id; },
                transform: function (d, i) {
                    return "translate(" + (that.dayBarWidth * (24 * 6 + 24) + 15) + "," + (i * 205 + 60) + ")rotate(" + d.rotate + ")";
                },
                "class": "timelineButton button"
            })
            .on("click", function (d) { d.fun() });


        d3.select("#downScroll").style("visibility", "hidden");

    };

    mobility_overlay.prototype.addToCalendar = function (aNode) {
    	/// <summary>
    	/// Add the extra clicked location onto the calendar.
    	/// </summary>
    	/// <param name="aNode" type="Object">The tree node to add to the calendar visualization</param>
        var that = this;
        var calGrp = this.visLayer.select("#calGrp").select("#points");
        calGrp.selectAll(".selectedHourTick").remove();
        // If the point is already on the calendar (top 5) do nothing
        for (var i = 0; i < 5 && i < this.data.location.length; i++) {
            if (this.currentCenterId == this.data.location[i].id)
                return;
        }

        var startYear = (new Date(this.dataStore.startTime)).getFullYear();

        var dayGrps = calGrp.selectAll(".selectedHourTick")
                .data(aNode.point.hourData).enter()
                .append("rect")
                .attr({
                    x: 0,
                    y: 0,
                    height: 14,
                    width: this.dayBarWidth,
                    "class": "hourTick selectedHourTick",
                    transform: function (d, i) {
                        var dDate = new Date(d.timestamp);
                        var dWeek = dDate.getWeek();
                        var dMonth = dDate.getMonth();
                        var dYear = dDate.getFullYear();
                        if (dWeek == 1 && dMonth == 11)
                            dWeek = 53;
                        var dDoW = (dDate.getDay() + 6) % 7;
                        var dHour = dDate.getHours();

                        return "translate(" + (that.dayBarWidth * (24 * dDoW + dHour)) + ","
                            + ((dYear - startYear) * 52 + dWeek) * 15 + ")";
                    },
                    id: function (d, i) {
                        var dDate = new Date(d.timestamp);
                        var dWeek = dDate.getWeek();
                        var dMonth = dDate.getMonth();
                        var dYear = dDate.getFullYear();
                        if (dWeek == 1 && dMonth == 11)
                            dWeek = 53;
                        var dDoW = (dDate.getDay() + 6) % 7;
                        var dHour = dDate.getHours();

                        return "ID_" + dDate.getDate() + "_" + dWeek + "_" + dMonth + "_" + dYear + "__" + dHour;
                    }
                })
                .style("fill", this.extraColor);

    };

    /*------------------------------------------  Toplist methods    ----------------------------------*/
    mobility_overlay.prototype.drawInfo = function () {
    	/// <summary>
    	/// Draw the Top 5 list and sparklines
    	/// </summary>
        var chart = this;

        var infoGrp = this.infoLayer.append("g").attr("class", "info");
        var DoW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        var sparkW = 7 * 24 * this.dayBarWidth;
        var sparkH = 20;
        var sparkX = d3.scale.linear().domain([0, 24 * 7]).range([0, sparkW]);

        infoGrp.append("text")//.attr("class", "darkText")
           .attr({
               x: 0,
               y: 0
           })
           .text("Average visits over the week")
           .style("font-size", "20");

        infoGrp.selectAll(".dow").data(DoW).enter().append("g")
              .append("text")//.attr("class", "darkText")
              .attr({
                  x: function (d, i) { return (24 * i * chart.dayBarWidth) + 10 + 60 },
                  y: 25
              })
              .text(function (d) { return d })
              .style("fill", "#9a9a9a")
              .style("font-size", "11px");


        for (var k = 0; k < 5 && k < chart.data.location.length; k++) {
            var sparklineData = [];

            for (var j = 0; j < chart.data.location[k].buckets.length; j++) {
                sparklineData = sparklineData.concat(chart.data.location[k].buckets[j].timeBucket);
            }

            var sparkY = d3.scale.linear()
                .domain([0, d3.max(sparklineData, function (d) {
                    return d.total;
                })])
                .range([sparkH, 0]);

            var sparkLine = d3.svg.line()
                .x(function (d, i) {
                    return sparkX(i)
                })
                .y(function (d) {
                    return sparkY(d.total);
                });

            var thisGroup = infoGrp.append("g")
                .attr("transform", "translate(0," + (k * 61 + 30) + ")");

            thisGroup.append("text")//.attr("class", "darkText")
                .attr({
                    x: 22,
                    y: 19
                })
                .text(chart.data.location[k].locationName)
                .style("font-size", "14");

            thisGroup.append("rect")
                .attr({
                    x: 0,
                    y: 10,
                    width: 12,
                    height: 12
                })
                .style("fill", chart.colorScale(chart.data.location[k].id));

            var thisPathGrp = thisGroup.append("g")
                  .attr("transform", "translate(62,30)");

            thisPathGrp.append("path")
                  .attr("d", sparkLine(sparklineData))
                  .style("fill", "none")
                  .style("stroke", "white")
                  .style("stroke-width", "1.5px");

            thisPathGrp.selectAll("line").data([1, 2, 3, 4, 5, 6]).enter()
               .append("line")
               .attr({
                   x1: function (d) { return d * 24 * chart.dayBarWidth; },
                   x2: function (d) { return d * 24 * chart.dayBarWidth; },
                   y1: 0,
                   y2: sparkH,
                   "stroke-dasharray": "5,2"
               })
               .style("stroke", "#fafafa")
               .style("stroke-width", "0.5px");

            thisPathGrp
               .append("line")
               .attr({
                   x1: 0,
                   x2: sparkW,
                   y1: sparkH,
                   y2: sparkH
               })
               .style("stroke", "#fafafa")
               .style("stroke-width", "0.5px");

  

        }




        infoGrp.attr("transform", "translate(10,55)");
    };

    mobility_overlay.prototype.addToInfo = function (aNode) {
        /// <summary>
        /// Add the extra clicked location to the top locations with a sparkline.
        /// </summary>
        /// <param name="aNode" type="Object">The tree node to add to the top section</param>
        var chart = this;

        this.visLayer.select("#addedInfo").remove();
        var DoW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        // If the point is already on the calendar (top 5) do nothing
        for (var i = 0; i < 5 && i < this.data.location.length; i++) {
            if (this.currentCenterId == this.data.location[i].id)
                return;
        }

        var chart = this;
        var infoGrp = this.visLayer.select(".info");
        var sparklineData = [];
        var sparkW = 7 * 24 * this.dayBarWidth;
        var sparkH = 20;
        var sparkX = d3.scale.linear().domain([0, 24 * 7]).range([0, sparkW]);
        var data = aNode.point;

        for (var j = 0; j < data.buckets.length; j++) {
            sparklineData = sparklineData.concat(data.buckets[j].timeBucket);
        }

        var sparkY = d3.scale.linear()
            .domain([0, d3.max(sparklineData, function (d) {
                return d.total;
            })])
            .range([sparkH, 0]);

        var sparkLine = d3.svg.line()
            .x(function (d, i) {
                return sparkX(i)
            })
            .y(function (d) {
                return sparkY(d.total);
            });

        var thisGroup = infoGrp.append("g")
            .attr("transform", "translate(0," + (5 * 61 + 30) + ")")
            .attr("id", "addedInfo");

        thisGroup.append("text")
            .attr({
                x: 25,
                y: 22
            })
            .text(data.locationName)
            .style("font-size", "16");

        thisGroup.append("rect")
            .attr({
                x: 0,
                y: 10,
                width: 12,
                height: 12
            })
            .style("fill", chart.extraColor);

        var thisPathGrp = thisGroup.append("g")
              .attr("transform", "translate(62,30)");

        thisPathGrp.append("path")
              .attr("d", sparkLine(sparklineData))
              .style("fill", "none")
              .style("stroke", "white")
              .style("stroke-width", "1.5px");;

        thisPathGrp.selectAll("line").data([1, 2, 3, 4, 5, 6]).enter()
           .append("line")
           .attr({
               x1: function (d) { return d * 24 * chart.dayBarWidth; },
               x2: function (d) { return d * 24 * chart.dayBarWidth; },
               y1: 0,
               y2: sparkH,
               "stroke-dasharray": "5,2"
           })
           .style("stroke", "#fafafa")
           .style("stroke-width", "0.5px");

        thisPathGrp
           .append("line")
           .attr({
               x1: 0,
               x2: sparkW,
               y1: sparkH,
               y2: sparkH
           })
           .style("stroke", "#fafafa")
           .style("stroke-width", "0.5px");

        //thisPathGrp.selectAll(".dow").data(DoW).enter().append("g")
        //    .append("text")//.attr("class", "darkText")
        //    .attr({
        //        x: function (d, i) { return (24 * i * chart.dayBarWidth) + 25 },
        //        y: 35
        //    })
        //    .text(function (d) { return d.substring(0, 2) })
        //    .style("font-size", "10px");
    };

    /*----------------------------------------  Utility methods    ------------------------------------*/
    mobility_overlay.prototype.redraw = function () {
    	/// <summary>
    	/// Redraw on resize
    	/// </summary>
        d3.select("#background")
            .attr({
                width: document.getElementById(this.parentId).offsetWidth,
                height: document.getElementById(this.parentId).offsetHeight
            });

        d3.select("#infoLayer")
           .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 570) + ",10)");

        var scale = Math.min(document.getElementById(this.parentId).offsetWidth / 1300, document.getElementById(this.parentId).offsetHeight / 740);
        if (scale < 1) scale = 1;

        d3.select("#treeGrp")
            .attr("transform", "translate(" + ((this.diameter / 2) * scale) + "," + ((this.diameter / 2) * scale) + ") scale(" + scale + ")")

        d3.select("#treeTxt")
            .attr("transform", "translate(" + ((this.diameter / 2) * scale - 10 * 7) + ",40)");

       this.visLayer.selectAll(".overlayCopyrightBox")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 720) + "," + (document.getElementById(this.parentId).offsetHeight - 25) + ")");

    };

    mobility_overlay.prototype.setRefs = function (mapRef,helpRef) {
    	/// <summary>
    	/// Set the map visualization reference.
    	/// </summary>
        /// <param name="mapRef" type="mobility_map">The map visualization reference</param>
        /// <param name="helpRef" type="mobility_help">The help reference</param>
        this.mapRef = mapRef;
        this.helpRef = helpRef;
    };

    mobility_overlay.prototype.closeOverlay = function () {
    	/// <summary>
    	/// Close the overlay and move to the map visualization.
        /// </summary>
        if (this.helpRef.helpOn)
            return;

        var chart = this;        
        var once = false;

        this.mapRef.map.center(this.data.location[0]);

        this.visLayer.select("#exploreBtn")
            .attr("visibility", "hidden");

        this.visLayer.select("#treeTxt")
           .style("visibility", "hidden");
        this.visLayer.select(".overlayCopyrightBox")
          .style("visibility", "hidden");


        this.visLayer.select("#helpMapBtn")
            .style("visibility", "hidden");

        // First move the info box away
        this.visLayer.select("#infoLayer")
            .transition()
            .duration(500)
            .attr("transform", "translate(5000)")
            .each("end", function () {
                // Then get rid of the background, links and node labels
                chart.visLayer.selectAll("#background")
                    .transition()
                    .duration(1000)
                    .style("opacity", 0);

                chart.visLayer.selectAll(".link")
                    .transition()
                    .duration(1000)
                    .style("opacity", 0);

                chart.visLayer.selectAll(".node text").remove();

                chart.visLayer.select("#treeGrp")
                    .transition()
                    .duration(2000)
                    .attr("transform", "translate(0,0)");

                chart.visLayer.selectAll(".node circle")
                    .on("click", null);
                
                // Move the nodes onto the appropriate map locations
                chart.visLayer.selectAll(".node")
                    .transition()
                    .duration(2000)
                    .attr("transform", function (d) {
                        var p = chart.mapRef.map.locationPoint({ lon: d.point.lon, lat: d.point.lat });
                        return "translate(" + p.x + "," + p.y + ")";
                    })                   

                    .each("end", function () {
                        // Make the nodes meld with the points on the map itself
                        var node = this;
                        d3.select(this).select("circle")
                            .transition()
                            .duration(500)
                            .attr("r", function (d) {
                                return chart.mapRef.radiusScale(d.point.count)
                            })
                            .style("fill", function (d) {
                                return chart.mapRef.colorScale(d.point.avgTime);
                            })
                            .style("stroke", function (d) {
                                return d3.rgb(chart.mapRef.colorScale(d.point.avgTime)).darker();
                            })
                            .style("stroke-width", 2)
                            .style("opacity", 0.9)
                            .each("end", function () {
                                if (!once) {
                                    chart.mapRef.begin("#overlayLayer");
                                    once = true;
                                }
                            });
                    });
            })

        if ($.mlog)
            $.mlog.logEvent("overlayClosed");

    };

    mobility_overlay.prototype.reopenOverlay = function () {
    	/// <summary>
    	/// Re-open the overlay with the simple view, covering the map.
    	/// </summary>     
        var chart = this;
        var scale = Math.min(document.getElementById(this.parentId).offsetWidth / 1300, document.getElementById(this.parentId).offsetHeight / 740);
        if (scale < 1) scale = 1;

        if ($.mlog)
            $.mlog.logEvent("overlayOpened");

        this.visLayer.select("#exploreBtn")
           .attr("visibility", "visible");

        this.visLayer.select("#treeGrp")
                    .transition()
                    .duration(1000)
            .attr("transform", "translate(" + ((this.diameter / 2) * scale) + "," + ((this.diameter / 2) * scale) + ") scale(" + scale + ")")

        d3.select("#treeTxt")
            .attr("transform", "translate(" + ((this.diameter / 2) * scale - 10 * 7) + ",40)")
            .style("visibility", "visible");

        this.visLayer.select("#helpMapBtn")
            .style("visibility", "visible");

        this.visLayer.select(".overlayCopyrightBox")
          .style("visibility", "visible");

        this.visLayer.select("#treeGrp").selectAll("circle")
            .attr("r", function (d) {
                return chart.radiusScale(d.point.count);
            })
            .attr("id", function (d) {
                return "treePoint_" + d.point.id;
            })
            .on("click", function (d) {
                chart.updateTree(d);
            })
            .style("fill", function (d) {
                if (chart.colorScale.domain().indexOf(d.point.id) != -1)
                    return chart.colorScale(d.point.id);
                else
                    return "white";
            })
            .style("cursor", "pointer")
            .style("stroke", null)
            .style("stroke-width", null);

        chart.visLayer.selectAll("#background")
                    .transition()
                    .duration(1000)
                    .style("opacity", 1)
                    .each("end", function() {
                        chart.visLayer.select("#infoLayer")
                            .transition()
                            .duration(500)
                            .attr("transform", "translate(" + (document.getElementById(chart.parentId).offsetWidth - 570) + ",10)");
                    });

        this.graphData = this.dataStore.makeGraph();
        this.updateTree(this.graphData);
    };

    mobility_overlay.prototype.drawCopyright = function () {
        /// <summary>
        /// Draw the copyright box
        /// </summary>
        var copGrp = this.visLayer.append("g").attr("class", "overlayCopyrightBox");

        var text = copGrp
        .append("text")
        .attr("x", 5)
        .attr("y", 5)
        .attr("class", "copyright")
        .style("font-size", "9px");

        text.append("a")
            .attr("class", "blackUrl")
        .attr("xlink:href", "http://www.openstreetmap.org/copyright")
            .append("tspan")
        .text("© OpenStreetMap ");

        text.append("tspan")
        .text("contributors");

        copGrp.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 720) + "," + (document.getElementById(this.parentId).offsetHeight - 25) + ")");

        var text2 = copGrp
        .append("text")
        .attr("x", 5)
        .attr("y", 15)
        .attr("class", "copyright")
        .style("font-size", "9px");

        //text2.append("a")
        //.attr("xlink:href", "https://foursquare.com/")
        //    .append("tspan")
        //.text("Location names © FourSquare ");

       

    };



    return mobility_overlay;

})();


// From http://weeknumber.net/how-to/javascript
Date.prototype.getWeek = function () {
	/// <summary>
	/// Get the week number for a date
	/// </summary>
	/// <returns type="Number">The week number</returns>
    var date = new Date(this.getTime()); date.setHours(0, 0, 0, 0);

    // Thursday in current week decides the year. 
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1. 
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1. 
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}
