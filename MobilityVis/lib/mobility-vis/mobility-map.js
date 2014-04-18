/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// <reference path="mobility-gui.js" />

var mobility_map = (function () {

    function mobility_map(divId, lat, long) {
        /// <summary>Constructor for visualization</summary>
        /// <param name="divId" type="String">Id of the parent contaier</param>
        /// <param name="lat" type="Number">Starting latitude</param>
        /// <param name="long" type="Number">Starting longitude</param>
        var chart = this;

        /*-----------------------------------------  Layers    ---------------------------------------*/
        // <field name="vis" type="String">Parent container ID</field>
        this.parentId = divId;                                                                                  
        /// <field name="vis" type="d3.selection()">Main SVG </field>
        this.vis = d3.select("#" + divId).append("svg:svg");
        /// <field name="visLayer" type="d3.selection()">Visualisation layer</field>
        this.visLayer = null;
        /// <field name="guiLayer" type="d3.selection()">GUI layer</field>
        this.guiLayer = null;
        /// <field type="d3.selection()">Timeline layer </field>
        this.timelineLayer = null;
        /// <field type="org.polymaps.map()">Map container </field>
        this.map = po.map()                                                                                 
            .container(this.vis.append("g").attr("id", "map-container").node());

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
        /// <field name="dayOfWeekFilter" type="Array">Filter for days of the week. Days in the filter 
        /// (as integers) will not be displayed</field>
        this.dayOfWeekFilter = [];
        /// <field name="timeOfDayFilter" type="Array">Filter for times of day. Periods in the filter 
        /// (as ranges) will not be displayed</field>
        this.timeOfDayFilter = [{from:0, to:6, label: "dusk", filtered:false},
                                {from:6, to:12, label: "morning", filtered:false}, 
                                {from:12, to:18, label: "afternoon", filtered:false}, 
                                {from:18, to:22, label: "evening", filtered:false}, 
                                {from:22, to:24, label: "night", filtered:false}];
        
        /// <field type="Array">List of currently displayed locations </field>
        this.displayedPoints = null;
        /// <field type="Number">Timestamp of the start of displayed period</field>
        this.startTime = 0;
        /// <field type="Number">Timestamp of the end of displayed period</field>
        this.endTime = 0;

        /*--------------------------------------  Scales    ------------------------------------------*/
        /// <field type="d3.scale">Scale for circle radii </field>
        this.radiusScale = d3.scale.pow().exponent(0.3).range([4, 20]).domain([1, 100]);
        /// <field type="d3.scale">Scale for circle colors</field>
        this.colorScale = d3.scale.linear().range(["#e80c7a", "#FFF500"]).domain([0, 12]).clamp(true);
        /// <field type="d3.scale">Scale for connections stroke</field>
        this.connScale = d3.scale.linear().range([0.35, 5]).domain([0, 20]).clamp(true); 
        //(["#262626", "#B9D40B"] zielony,["#023E73", "#00AAB5"]niebieski   

        /*------------------------------------  Map parameters    ------------------------------------*/
        /// <field type="Object">First reference point to compute scale</field>                                                                              
        this.refPoint1 = { lat: 55, lon: 56 };
        /// <field type="Object">Second reference point to compute scale</field>                                                                          
        this.refPoint2 = { lat: 56, lon: 56 };
        /// <field type="Number">Euclidean distance between the reference points</field>                                                                           
        this.refDistance = 0;
        /// <field type="Number">Current scale - proportion between the reference distance before and after 
        /// zoom</field>                                                                            
        this.scale = 1;

        /*----------------------------------------- Control ------------------------------------------*/
        this.detailView = false;
        this.tickDuration = 1000;

        /*--------------------------------------  Constructor    -------------------------------------*/        
        this.map
            .add(po.interact())
            .add(po.image()
            .url(po.url("http://{S}www.toolserver.org/tiles/bw-mapnik/{Z}/{X}/{Y}.png")
          .hosts(["a.", "b.", "c.", ""])));
        
        d3.csv("data/newdata.csv", function (data) {
            // Data has been loaded - initialize
            chart.visLayer = d3.select(".map").insert("svg:g", ".compass").attr("class", "vislayer");
            chart.visLayer.append("g").attr("class", "connectionLayer");
            chart.visLayer.append("g").attr("class", "pointLayer");
            chart.guiLayer = d3.select("svg").append("svg:g").attr("class", "gui");
            chart.drawGui(chart.guiLayer);
            
            // Establishing initial time
            chart.data = chart.filterPoints(data);            
            chart.startTime = (chart.data.time[0].start+chart.data.time[chart.data.time.length - 1].end)/2;
            chart.endTime = chart.data.time[chart.data.time.length - 1].end;
            chart.timelineRef = new mobility_timeline(chart.timelineLayer, chart, chart.data.time[0].start, chart.data.time[chart.data.time.length - 1].end, chart.startTime);           
            
            // Whenever the map moves, update the marker positions.
            chart.map.on("move", function () { chart.onMapMove() });

            // Begin
            chart.updatePoints(false);
            chart.updateConnections(false, 1500);
        });


        this.map.center({ lat: lat, lon: long});
    };

    /*----------------------------------------------------------------------  Data methods    ---------------------------------------------------------------------*/

    mobility_map.prototype.filterPoints = function (data) {
        /// <summary>
        /// Filters and clusters raw data point
        /// </summary>
        /// <param name="data">Raw data</param>
        /// <returns type="Object">Filtered data containing unique points, time data and point dictionary</returns>
        var chart = this;
        var filteredData = [];
        var timeData = [];
        var locDict = {};
        var dict = {};

        //grouping pois with the same ID

        for (var i = 0; i < data.length; i++) {
            if (dict[data[i].id] == undefined)
                dict[data[i].id] = [data[i]];
            else
                dict[data[i].id].push(data[i])
            timeData.push({ id: data[i].id, start: data[i].arrival * 1000, end: data[i].departure * 1000 });
        }
        //counting average of pois location
        for (var id in dict) {
            var point = dict[id];
            var averagePoint = new mobility_point(id, d3.mean(point, function (d) { return d.lat }), d3.mean(point, function (d) { return d.lon }));

            locDict[id] = averagePoint;
            filteredData.push(averagePoint);
        }

        return { location: filteredData, time: timeData, locDict: locDict };
    };

    mobility_map.prototype.updatePoints = function (animatedTick) {
        /// <summary>
        /// Updates the point according to time period
        /// </summary>
        /// <param name="animatedTick">Whether the update is made during movement animation</param>

        var countDict = {};
        this.displayedPoints = [];
        // Count the number and time of visits in all point for this period in dictionary
        for (var i = 0; i < this.data.time.length; i++) {
            var curDate = new Date(this.data.time[i].start);
            if (this.data.time[i].start > this.endTime)
                break;
            else if (this.data.time[i].start > this.startTime) {
                var period = this.data.time[i].end - this.data.time[i].start;
                if (countDict[this.data.time[i].id] == undefined)
                    countDict[this.data.time[i].id] = { time: period, count: 1, visits: [] };
                else {
                    countDict[this.data.time[i].id].time += period;
                    countDict[this.data.time[i].id].count += 1;
                }

                countDict[this.data.time[i].id].visits.push(this.data.time[i]);
            }
        }
        // Move data from dictionary to Array
        for (var i = 0; i < this.data.location.length; i++)
            if (countDict[this.data.location[i].id] == undefined && !animatedTick) {
                this.data.location[i].clear();
            }
            else if (!animatedTick) {

                this.data.location[i].update(countDict[this.data.location[i].id].count,
                                                countDict[this.data.location[i].id].time,
                                                countDict[this.data.location[i].id].visits);

            }
            else if (countDict[this.data.location[i].id] != undefined && animatedTick) {
                this.data.location[i].count += (countDict[this.data.location[i].id].count);
                this.displayedPoints.push(this.data.location[i]);
            }

        if (!animatedTick) {
            // Display only the points that have count > 0
            this.data.location.sort(function (a, b) { return b.count - a.count; });
            var slice = 0
            for (var i = 0; i < this.data.location.length; i++) {
                if (this.data.location[i].count == 0) break;
                this.data.location[i].time /= (this.data.location[i].count * 1000 * 60 * 60);
                this.data.location[i].bucketData();
                slice = i + 1;
            }
            this.displayedPoints = this.data.location.slice(0, slice);
        }

        this.drawPoints(animatedTick);
    };

    mobility_map.prototype.updateConnections = function (animatedTick, duration) {
        /// <summary>
        /// Update the connections data within the given time period
        /// </summary>
        /// <param name="animatedTick">Whether the update is made during movement animation</param>
        /// <param name="duration">Duration of drawing of a single connection</param>
        var delay = 0;
        var p1 = this.map.locationPoint(this.refPoint1),
            p2 = this.map.locationPoint(this.refPoint2);
        this.refDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        this.scale = 1;
        this.data.connections = [];

        //Generate the connection objects
        for (var i = 0; i < this.data.time.length - 1; i++) {
            var found = false;
            var curDate = new Date(this.data.time[i].start);
            var nextDate = new Date(this.data.time[i + 1].start);
            if (this.data.time[i].start > this.endTime)
                break;
            else if (this.data.time[i].start > this.startTime && this.data.time[i].id != this.data.time[i + 1].id) {
                for (var j = 0; j < this.data.connections.length; j++) {
                    if (this.data.connections[j].from == this.data.time[i].id && this.data.connections[j].to == this.data.time[i + 1].id) {
                        this.data.connections[j].score += 1;
                        found = true;
                        break;
                    }
                }
                if (!found)
                    this.data.connections.push({ from: this.data.time[i].id, to: this.data.time[i + 1].id, tresholded: false, score: 1, tresholdedScore: 0 });
            }

        }
        //Run thresholding
        if (!animatedTick) {
            this.tresholdEdges(0.6);
            // ...and draw
            for (var i = 0; i < this.data.connections.length ; i++) {
                this.drawConnection(this.data.connections[i], duration, 0);
            }
        }
        else
            for (var i = 0; i < this.data.connections.length ; i++) {
                this.data.connections[i].tresholded = true
                this.drawConnection(this.data.connections[i], (duration) / this.data.connections.length, i * (duration / this.data.connections.length));
            }
    };

    mobility_map.prototype.tresholdEdges = function (alpha) {
        /// <summary>
        /// Thresholds the edges of connection network using algorithms from Serrano et al. 
        /// "Extracting the multiscale backbone of complex weighted network"
        /// </summary>
        /// <param name="alpha"></param>
        var nodes = this.data.location;
        var edges = this.data.connections;

        var __degree = function (edges, node, weighted) {
            var result = 0;
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].from == node || edges[i].to == node)
                    result += weighted ? edges[i].score : 1;
            };
            return result;
        };
        var __nbs = function (edges, node) {
            var result = [];
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].from == node)
                    result.push({ nb: edges[i].to, score: edges[i].score });
            };
            return result;
        };
        // integral of (1-x)^(k_n-2)
        var integral = function (x) {
            return -(Math.pow(1 - x, k_n - 1) / k_n - 1);
        };


        var tresholdedEdges = [];


        for (var i = 0; i < nodes.length; i++) {
            var k_n = __degree(edges, nodes[i].id, false);
            if (k_n > 1) {
                var sum_w = __degree(edges, nodes[i].id, true);
                var nbs = __nbs(edges, nodes[i].id);

                for (var j = 0; j < nbs.length; j++) {
                    var edgeW = nbs[j].score;
                    var p_ij = edgeW / sum_w;
                    var alpha_ij = 1 - (k_n - 1) * (integral(p_ij) - integral(0));
                    if (alpha_ij < alpha) {
                        var found = false;
                        for (var e = 0; e < tresholdedEdges.length; e++) {
                            if (tresholdedEdges[e].from == nbs[j].nb && tresholdedEdges[e].to == nodes[i].id)
                                found = true;
                        }
                        if (!found)
                            tresholdedEdges.push({
                                from: nodes[i].id,
                                to: nbs[j].nb,
                                score: nbs[j].score
                            });

                    }
                }
            }
        }
        for (var i = 0; i < tresholdedEdges.length; i++) {
            for (var j = 0; j < edges.length; j++) {
                if (tresholdedEdges[i].from == edges[j].from && tresholdedEdges[i].to == edges[j].to) {
                    edges[j].tresholded = true;
                    edges[j].score = tresholdedEdges[i].score;
                    break;
                }

            }
        }
    };

    /*--------------------------------------------------------------------  Drawing methods    --------------------------------------------------------------------*/

    mobility_map.prototype.drawPoints = function (animatedTick) {
    	/// <summary>
    	/// Draw the points onto the visualization layer
    	/// </summary>
        /// <param name="animatedTick">Whether the update is made during movement animation</param>
        var chart = this;
        var layer = d3.select(".pointLayer");

        d3.select(".vislayer").selectAll(".connection").remove();
        var marker = layer.selectAll(".locationPoint")
             .data(this.displayedPoints, function (d) { return d.id });
        if (!animatedTick)
            // Remove the points that are no longer displayed
            marker.exit().transition().attr("r", 0).remove();
        else {
            layer.selectAll(".location").transition().style("fill", "#aaaaaa").style("stroke", "#888888");
        }
        var newMarkers = marker.enter().append("svg:g").attr("class","locationPoint")
             .attr("transform", transform);

        // Add a circle.
        newMarkers.append("svg:circle")
            .attr("class", "location")
            .attr("r", 0).style("fill-opacity", 0.9)
            .style("fill", this.colorScale(0))
            .style("stroke", "#E80C7A")
            .style("stroke-width", 2)
            .on("mouseover", function (d) { if(!chart.detailView) chart.hoverDetails(d); })
            .on("mouseout", function () { if (!chart.detailView) return chart.hideHoverDetails(); })
            .on("click", function (d) { return chart.showDetails(d); });

        marker.selectAll("circle").transition().duration(100).attr("r", function (d) {
            return chart.radiusScale(d.count)
        }).style("fill", function (d) {           
            if (chart.pointInFilter(d))
                return chart.colorScale(d.time);
            else
                return "#bbbbbb";
        }).style("stroke", function (d) {
            if (chart.pointInFilter(d))
                return d3.rgb(chart.colorScale(d.time)).darker();
            else
                return d3.rgb("#bbbbbb").darker();
        });

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }       
    };

    mobility_map.prototype.drawConnection = function (connection, speed, delay) {
    	/// <summary>
    	/// Draw a single connection on the map
    	/// </summary>
    	/// <param name="connection" type="Object">Connection object</param>
    	/// <param name="speed" type="Number">Speed with which to draw the curve</param>
    	/// <param name="delay" type="Number">Delay before the curve drawing begins</param>
        var chart = this;
        var pointA = this.data.locDict[connection.from];
        var pointB = this.data.locDict[connection.to];
        var parent = d3.select(".connectionLayer");
        var realA = chart.map.locationPoint(pointA);
        var realB = chart.map.locationPoint(pointB);        
        //Get the perpendicular vector to the connection
        var perpendicular = { x: realB.y - realA.y, y: realB.x - realA.x };
        var perLength = Math.sqrt(Math.pow(perpendicular.x, 2) + Math.pow(perpendicular.y, 2));
        var vecLength = Math.sqrt(Math.pow(realB.x - realA.x, 2) + Math.pow(realB.y - realA.y, 2));
        perpendicular.x /= perLength;
        perpendicular.y /= perLength;


        var startPoint = { x: 0, y: 0 };
        var endPoint = { x: realB.x - realA.x, y: realB.y - realA.y };
        var getRandom = function (min, max) {
            return Math.random() * (max - min) + min;
        };

        // Find the middle control point for the Bezier curve
        var midPoint = {
            x: startPoint.x + (endPoint.x - startPoint.x) / 2 + vecLength / 5 * getRandom(0.2, 0.5) * perpendicular.x,
            y: startPoint.y + (endPoint.y - startPoint.y) / 2 - vecLength / 5 * getRandom(0.2, 0.5) * perpendicular.y
        };
        
        var t = 0,
            delta = .01,
            points = [startPoint, midPoint,endPoint],
            bezier = null,
            line = d3.svg.line().x(x).y(y);
        var connCount = connection.score;

        var pathGroup = parent
            .append("svg:g").data([connection]).attr("id", "conn_" + pointA.id + "_" + pointB.id)
            .attr("class", "connection")
            .attr("transform", transform(pointA) + " scale(" + chart.scale + ")")
            .style("opacity", function (d) {
                if (d.tresholded)
                    return "1";
                else return "0";
            })
            .style("stroke-width", chart.connScale(connCount) * (1 / chart.scale) + "px");
     
        var last = 0;
        // Timer for drawing of the curve
        d3.timer(function (elapsed) {
            if (elapsed > delay) {
                t = (t + (elapsed - delay - last) / speed) ;
                last = elapsed - delay;
                update();
                if (elapsed-delay > speed)
                    return true;
            }

        });

        function update() {
            // Update the drawing of the curve
            var curve = pathGroup.selectAll("path.curve");
            curve.data(getCurve).enter().append("svg:path")
                .attr("class", "curve");

            curve.attr("d", line);
        }

        function interpolate(d, p) {
            if (arguments.length < 2) p = t;
            var r = [];
            for (var i = 1; i < d.length; i++) {
                var d0 = d[i - 1], d1 = d[i];
                r.push({ x: d0.x + (d1.x - d0.x) * p, y: d0.y + (d1.y - d0.y) * p });
            }
            return r;
        }


        function getLevels(d, t_) {
            if (arguments.length < 2) t_ = t;
            var x = [points.slice(0, d)];
            for (var i = 1; i < d; i++) {
                x.push(interpolate(x[x.length - 1], t_));
            }
            return x;
        }

        function getCurve() {
            var curve = bezier;
            if (!curve) {
                curve = bezier = [];
                for (var t_ = 0; t_ <= 100; t_ += delta*100) {
                    var x = getLevels(3, t_/100);
                    curve.push(x[x.length - 1][0]);
                }
            }
            return [curve.slice(0, t / delta +1)];
        }

        function x(d) { return d.x; }
        function y(d) { return d.y; }

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };

    mobility_map.prototype.drawGui = function (parent) {
    	/// <summary>
    	/// Draw the GUI layer
    	/// </summary>
    	/// <param name="parent">Parent container of the GUI layer</param>
        this.timelineLayer = this.guiLayer.append("svg:g")
            .attr("class", "timeline")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 50) + ",10)");

        this.gui = new mobility_gui(this.guiLayer, this);
    };

    mobility_map.prototype.onMapMove = function () {
    	/// <summary>
    	/// Called whenever the map is moved/zoomed
    	/// </summary>
        var chart = this;
        var p1 = chart.map.locationPoint(chart.refPoint1),
            p2 = chart.map.locationPoint(chart.refPoint2);
        var newRefDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        chart.scale = newRefDistance / chart.refDistance;

        d3.select(".vislayer").selectAll(".locationPoint").attr("transform", transform);
        d3.select(".vislayer").selectAll(".connection").attr("transform", function () {
            var id = +(this.getAttribute("id").split("_")[1]);           
            return transform(chart.data.locDict[id])+ " scale(" + chart.scale + ")";
        });
        d3.select(".vislayer").selectAll(".connection").style("stroke-width", function (e) {
            return chart.connScale(e.score) * (1/chart.scale) + "px";

        });
        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };

    mobility_map.prototype.redraw = function () {
        /// <summary>
        /// Handles browser window resizing
        /// </summary>
        var chart = this;
        this.onMapMove();
        this.gui.update();
        this.timelineLayer.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 50) + ",10)");
    };

    /*--------------------------------------------------------------------  Details methods    --------------------------------------------------------------------*/
    mobility_map.prototype.hoverDetails = function (d) {
        /// <summary>
        /// Displays details for given location
        /// </summary>
        /// <param name="d">The given location</param>
        var chart = this;
        this.visLayer.select(".connectionLayer").selectAll(".connection")
            .transition()
            .style("opacity", function (e) {
                if (e.from == d.id || e.to == d.id)
                    return "1";
                else
                    return "0";
            });



        this.gui.drawScaleTick(d.time);

    };

    mobility_map.prototype.hideHoverDetails = function () {
        /// <summary>
        /// Hides details for a location
        /// </summary>
        var chart = this;
        this.visLayer.select(".connectionLayer").selectAll(".connection").transition()
            .style("opacity", function (e) {
                if (e.tresholded)
                    return "1";
                else return "0";
            });

        this.gui.removeScaleTick();

    };

    mobility_map.prototype.showDetails = function (d) {
        /// <summary>
        /// Displays details for given location
        /// </summary>
        /// <param name="d">The given location</param>
        var chart = this;
        this.hideDetails();
        this.hoverDetails(d);
        this.detailView = true;

        var currPos = this.map.center();
        var curMultiplier = 0.1;

        d3.timer(function () {
            chart.map.center({ lat: currPos.lat + ((d.lat - currPos.lat) * curMultiplier), lon: currPos.lon + ((d.lon - currPos.lon) * curMultiplier) });
            curMultiplier += 0.1;
            if (curMultiplier >= 1)
                return true;
        });

        this.gui.showDetailFrame(d);

    };

    mobility_map.prototype.hideDetails = function () {
        /// <summary>
        /// Hide the details frame
        /// </summary>
        this.detailView = false;
        this.hideHoverDetails();
        this.gui.hideDetailFrame();
    };

    /*--------------------------------------------------------------------  Utility methods    --------------------------------------------------------------------*/
    mobility_map.prototype.updateTime = function (start, end) {
    	/// <summary>
    	/// Change displayed time period. Event handler for timeline's brush event
    	/// </summary>
    	/// <param name="start">Begining of new time period</param>
    	/// <param name="end">End of time period</param>
        this.startTime = start;
        this.endTime = end;
        this.updatePoints(false);
    };

    mobility_map.prototype.updateTimeEnd = function () {
    	/// <summary>
        /// Change displayed time period. Event handler for timeline's brushend event
    	/// </summary>
        this.updateConnections(false, 1500);
    };

    mobility_map.prototype.pointInFilter = function (d) {
        /// <summary>
        /// Check if the data point passes through filters
        /// </summary>
        /// <param name="d" type="mobility_point">The data point to filter</param>
        /// <returns type="Boolean">Whether it passes or not</returns>
        var that = this;
        var allDays = [0, 1, 2, 3, 4, 5, 6];


        if (this.dayOfWeekFilter.length == 0) {
            if (this.timeOfDayFilter.every(function (e) { return !e.filtered; }))
                return true;
            else {
                return allDays.some(function (e) {
                    return that.timeOfDayFilter.some(function (f) {
                        return f.filtered && (d.sumBuckets(e, f.from, f.to) > 0)
                    });
                });
            }

        }
        else {
            if (this.timeOfDayFilter.every(function (e) { return !e.filtered; }))
                return this.dayOfWeekFilter.some(function (e) {
                    return d.buckets[e].total > 0;
                });
            else {
                return this.dayOfWeekFilter.some(function (e) {
                    return that.timeOfDayFilter.some(function (f) {
                        return f.filtered && (d.sumBuckets(e, f.from, f.to) > 0)
                    });
                });
            }
        }


    };

    mobility_map.prototype.updateDayOfWeekFilter = function (filter) {
    	/// <summary>
    	/// Change the current day of week filtering
    	/// </summary>
    	/// <param name="filter">Day of week to highlight</param>
        if (this.dayOfWeekFilter.indexOf(filter) != -1)
            this.dayOfWeekFilter.splice(this.dayOfWeekFilter.indexOf(filter), 1);
        else
            this.dayOfWeekFilter.push(filter);

        this.updatePoints(false);
        this.updateConnections(false , 1500);
    };

    mobility_map.prototype.updateTimeofDayFilter = function (filter) {
        /// <summary>
        /// Change the current time of day filtering
        /// </summary>
        /// <param name="filter">Period index to highlight</param>
        this.timeOfDayFilter[filter].filtered = !this.timeOfDayFilter[filter].filtered;


        this.updatePoints(false);
        this.updateConnections(false, 1500);
    };

    mobility_map.prototype.timeTick = function () {
    	/// <summary>
    	/// Advance period by one day
    	/// </summary>
        this.startTime += 1000 * 60 * 60 * 24;
        this.endTime += 1000 * 60 * 60 * 24;
        this.updatePoints(true);
        this.updateConnections(true, this.tickDuration);
    };
 
    return mobility_map;

})();