/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// <reference path="mobility-gui.js" />
/// <reference path="mobility-datastore.js" />
///
/// ======================================================================================================
/// File: MOBILITY-MAP.js
/// ======================================================================================================
/// <summary>
/// This class is the "exploration mode" map visualization for the mobility visualization.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================


var mobility_map = (function () {

    function mobility_map(divId, lat, long, dataStore) {
        /// <summary>Constructor for visualization</summary>
        /// <param name="divId" type="String">Id of the parent contaier</param>
        /// <param name="lat" type="Number">Starting latitude</param>
        /// <param name="long" type="Number">Starting longitude</param>
        /// <param name="dataStore" type="mobility_datastore">The reference to the data store</param>
        var chart = this;

        /*-----------------------------------------  Layers    ---------------------------------------*/
        /// <field name="vis" type="String">Parent container ID</field>
        this.parentId = divId;                                                                                  
        /// <field name="vis" type="d3.selection">Main SVG </field>
        if (d3.select("svg").empty())
            this.vis = d3.select("#" + divId)
                .append("svg:svg");
        else
            this.vis = d3.select("svg");
        /// <field name="visLayer" type="d3.selection">Visualisation layer</field>
        this.visLayer = null;
        /// <field name="guiLayer" type="d3.selection">GUI layer</field>
        this.guiLayer = null;
        /// <field type="d3.selection">Timeline layer </field>
        this.timelineLayer = null;
        /// <field type="org.polymaps.map">Map container </field>
        this.map = po.map()                                                                                 
            .container(this.vis.append("g").attr("id", "map-container").node());

        /*---------------------------------------  References    --------------------------------------*/
        /// <field name="overlayRef" type="mobility_overlay">Reference to data storage</field>
        this.overlayRef = null;
        /// <field name="timelineRef" type="mobility_timeline">Reference to data storage</field>
        this.timelineRef = null;
        /// <field name="gui" type="mobility_gui">Reference to the GUI layer object</field>
        this.gui = null;

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
        /// <field name="dataStore" type="mobility_datastore">Reference to data storage</field>
        this.dataStore = dataStore;        
        /// <field name="dayOfWeekFilter" type="Array">Filter for days of the week. Days in the filter 
        /// (as integers) will not be displayed</field>
        this.dayOfWeekFilter = [];
        /// <field name="timeOfDayFilter" type="Array">Filter for times of day. Periods in the filter 
        /// (as ranges) will not be displayed</field>
        this.timeOfDayFilter = [{ from: 0, to: 6, label: "dusk", filtered: false },
                                { from: 6, to: 12, label: "morning", filtered: false },
                                { from: 12, to: 18, label: "afternoon", filtered: false },
                                { from: 18, to: 22, label: "evening", filtered: false },
                                { from: 22, to: 24, label: "night", filtered: false }];
        
        /// <field name="displayedPoints" type="Array">List of currently displayed locations </field>
        this.displayedPoints = null;
        /// <field name="startTime" type="Number">Timestamp of the start of displayed period</field>
        this.startTime = 0;
        /// <field name="endTime" type="Number">Timestamp of the end of displayed period</field>
        this.endTime = 0;

        /*--------------------------------------  Scales    ------------------------------------------*/
        /// <field name="radiusScale" type="d3.scale">Scale for circle radii </field>
        this.radiusScale = d3.scale.pow().exponent(0.3).range([4, 20]).domain([1, 100]);
        /// <field name="colorScale" type="d3.scale">Scale for circle colors</field>
        this.colorScale = d3.scale.linear().range(["#e80c7a", "#FFF500"]).domain([0, 12]).clamp(true);
        /// <field name="connScale" type="d3.scale">Scale for connections stroke</field>
        this.connScale = d3.scale.linear().range([0.35, 5]).domain([0, 20]).clamp(true); 
        //(["#262626", "#B9D40B"] zielony,["#023E73", "#00AAB5"]niebieski   

        /*------------------------------------  Map parameters    ------------------------------------*/
        /// <field name="refPoint1" type="Object">First reference point to compute scale</field>                                                                              
        this.refPoint1 = { lat: 55, lon: 56 };
        /// <field name="refPoint2" type="Object">Second reference point to compute scale</field>                                                                          
        this.refPoint2 = { lat: 56, lon: 56 };
        /// <field name="refDistance" type="Number">Euclidean distance between the reference points</field>                                                                           
        this.refDistance = 0;
        /// <field name="scale" type="Number">Current scale - proportion between the reference distance before and after 
        /// zoom</field>                                                                            
        this.scale = 1;

        /*----------------------------------------- Control ------------------------------------------*/
        /// <field name="detailView" type="Boolean">The flag indicating whether the detailed view is open</field>                                                                              
        this.detailView = false;
        /// <field name="detailItem" type="mobility_point">The data point which is displayed in the detailed view</field>                                                                              
        this.detailItem = null;
        /// <field name="animating" type="Boolean">The flag indicating whether an animation is playing currently</field>                                                                              
        this.animating = false;
        /// <field name="tickDuration" type="Number">Duration of each tick during time animation</field>                                                                              
        this.tickDuration = 1000;

        /*--------------------------------------  Constructor    -------------------------------------*/        
        this.map
            .add(po.interact())
            .add(po.image()
            .url(po.url("http://{S}www.toolserver.org/tiles/bw-mapnik/{Z}/{X}/{Y}.png")
          .hosts(["a.", "b.", "c.", ""])));

        this.visLayer = d3.select(".map").insert("svg:g", ".compass").attr("class", "vislayer");
        this.visLayer.append("g").attr("class", "connectionLayer");
        this.visLayer.append("g").attr("class", "pointLayer");
        this.guiLayer = d3.select("svg").append("svg:g").attr("class", "gui");
        this.drawGui(chart.guiLayer);
        
        addEventListener("dataReady", function (e) {         
             //Data has been loaded - initialize 
            chart.data = dataStore.data; 
            chart.startTime = e.detail.startTime;
            chart.endTime = e.detail.endTime;
            chart.timelineRef = new mobility_timeline(chart.timelineLayer, chart, chart.data.time[0].start, chart.data.time[chart.data.time.length - 1].end, chart.startTime);           
            chart.map.center({ lat: lat, lon: long });
            chart.gui.blockGui();            
        });        
    };

    mobility_map.prototype.begin = function (overlayRef) {
    	/// <summary>
    	/// Initialize the map visualization when the overlay is closed
    	/// </summary>
    	/// <param name="overlayRef" type="d3.selection">The reference to the overlay SVG element</param>
        var chart = this;
        // Whenever the map moves, update the marker positions.
        this.map.on("move", function () { chart.onMapMove() });
        this.startTime = this.dataStore.startTime;
        this.endTime = this.dataStore.endTime;
        this.gui.unblockGui();

        // Begin
        this.updatePoints(false);
        this.visLayer.selectAll("circle")
            .style("visibility", "hidden");
        setTimeout(function () {
            chart.visLayer.selectAll("circle")
                .style("visibility", "visible");
            d3.select(overlayRef).style("visibility", "hidden");
        }, 500);

        this.updateTimeEnd();
    };

    /*-----------------------------------------  Data methods    --------------------------------------*/
    mobility_map.prototype.updatePoints = function (animatedTick) {
        /// <summary>
        /// Updates the point according to time period
        /// </summary>
        /// <param name="animatedTick">Whether the update is made during movement animation</param>
        this.displayedPoints = this.dataStore.updatePoints(this.startTime, this.endTime, animatedTick);        

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

        this.dataStore.updateConnections(this.startTime, this.endTime, !animatedTick);

        if (!animatedTick)
            for (var i = 0; i < this.data.connections.length ; i++)
                this.drawConnection(this.data.connections[i], duration, 0);
        else
            for (var i = 0; i < this.data.connections.length ; i++)
                this.drawConnection(this.data.connections[i], (duration) / this.data.connections.length, i * (duration / this.data.connections.length));

    };

  
    /*----------------------------------------  Drawing methods    ------------------------------------*/
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
            marker.exit().attr("r", 0).remove();
        else {
            layer.selectAll(".location").transition().style("fill", "#aaaaaa").style("stroke", "#888888");
        }
        var newMarkers = marker.enter().append("svg:g").attr("class","locationPoint")
             .attr("transform", transform);

        // Add a circle.
        newMarkers.append("svg:circle")
            .attr("class", "location")
            .attr("r", 0)
            .attr("id", function (d) { return "location-" + d.id })
            .style("fill", this.colorScale(0))
            .style("stroke", "#E80C7A")
            .style("stroke-width", 2)
            .style("cursor", (this.animating)?"default":"pointer")
            .on("mouseover", function (d) { if(!chart.detailView) chart.hoverDetails(d); })
            .on("mouseout", function () { if (!chart.detailView) return chart.hideHoverDetails(); })
            .on("click", function (d) { if (!chart.animating) return chart.showDetails(d); });

        // Animate all the circles
        marker.selectAll("circle").transition()
            .duration(100)
            .attr("r", function (d) {
                return chart.radiusScale(d.count);
            })
            .style("cursor", (this.animating) ? "default" : "pointer")
            .style("fill", function (d) {
                if (d.filtered)
                    return chart.colorScale(d.avgTime);
                else
                    return "#bbbbbb";
                })
            .style("stroke", function (d) {
                if (d.filtered)
                    return d3.rgb(chart.colorScale(d.avgTime)).darker();
                else
                    return d3.rgb("#bbbbbb").darker();
                })
            .style("opacity", function (d) {
                if (d.filtered)
                    return 0.9;
                else
                    return 0.7;
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

        if (!pointA.filtered || !pointB.filtered)
            return;
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
            .style("stroke-width", function () {
                if (!chart.animating)
                    return chart.connScale(connCount) * (1 / chart.scale) + "px";
                else
                    return (3 / chart.scale) + "px";
            });
     
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
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 40) + ",10)");

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
            if (!chart.animating)
                return chart.connScale(e.score) * (1 / chart.scale) + "px";
            else
                return (3 / chart.scale) + "px";
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
        this.gui.update(this.startTime, this.endTime);
        this.timelineLayer.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 40) + ",10)");
    };

    /*-----------------------------------------  Details methods    -----------------------------------*/
    mobility_map.prototype.hoverDetails = function (d) {
        /// <summary>
        /// Displays details for given location
        /// </summary>
        /// <param name="d" type="mobility-point">The given location</param>
        var chart = this;
        this.visLayer.select(".connectionLayer").selectAll(".connection")
            .transition()
            .style("opacity", function (e) {
                if (e.from == d.id || e.to == d.id)
                    return "1";
                else
                    return "0";
            });



        this.gui.drawScaleTick(d.avgTime);

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
        /// <param name="d" type="mobility-point">The given location</param>
        var chart = this;
        this.hideDetails();
        this.hoverDetails(d);
        this.detailView = true;
        this.detailItem = d;

        var currPos = this.map.center();
        var curMultiplier = 0.1;

        d3.timer(function () {
            chart.map.center({ lat: currPos.lat + ((d.lat - currPos.lat) * curMultiplier), lon: currPos.lon + ((d.lon - currPos.lon) * curMultiplier) });
            chart.map.panBy({ x: -(document.getElementById(chart.parentId).offsetWidth / 4) * curMultiplier, y: 0 });
            curMultiplier += 0.1;
            if (curMultiplier >= 1) {
                
                return true;
            }
        });

        var findConnection = function (a, b) {
            for (var i = 0; i < chart.data.connections.length; i++) {
                if ((chart.data.connections[i].from == a &&
                        chart.data.connections[i].to == b) ||
                    (chart.data.connections[i].from == b &&
                        chart.data.connections[i].to == a))
                    return true;
            }

            return false;
        }

        d3.selectAll(".location").transition().duration(100)
          .style("fill", function (e) {
              if (findConnection(d.id, e.id) || d == e)
                  return chart.colorScale(e.avgTime);
              else 
                  return "#bbbbbb";
          }).style("stroke", function (e) {
              if (findConnection(d.id, e.id))
                  return d3.rgb(chart.colorScale(e.avgTime)).darker();
              else if (d != e)
                  return d3.rgb("#bbbbbb").darker();
              else
                  return "#023E73";
          });


        this.gui.showDetailFrame(d);

    };

    mobility_map.prototype.hideDetails = function () {
        /// <summary>
        /// Hide the details frame
        /// </summary>
        var chart = this;

        this.detailView = false;
        this.hideHoverDetails();
        this.gui.hideDetailFrame();

        d3.selectAll(".location").transition().duration(100)
            .style("fill", function (d) {
                if (chart.pointInFilter(d))
                    return chart.colorScale(d.avgTime);
                else
                    return "#bbbbbb";
            }).style("stroke", function (d) {
                if (chart.pointInFilter(d))
                    return d3.rgb(chart.colorScale(d.avgTime)).darker();
                else
                    return d3.rgb("#bbbbbb").darker();
            });


    };

    /*----------------------------------------  Utility methods    ------------------------------------*/
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
        var chart = this;
    	/// <summary>
        /// Change displayed time period. Event handler for timeline's brushend event
    	/// </summary>
        this.dataStore.bucketData(function (d) { return chart.pointInFilter(d) });
        this.drawPoints(false);
        this.updateConnections(false, 1500);

        if (this.detailView) {
            this.gui.update(this.startTime, this.endTime);
            this.hideHoverDetails();
            this.hoverDetails(this.detailItem);
        }
        
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
    	/// <param name="filter" type="Number">Day of week to highlight</param>
        if (this.dayOfWeekFilter.indexOf(filter) != -1)
            this.dayOfWeekFilter.splice(this.dayOfWeekFilter.indexOf(filter), 1);
        else
            this.dayOfWeekFilter.push(filter);

        this.updatePoints(false);
        this.updateTimeEnd();
    };

    mobility_map.prototype.updateTimeofDayFilter = function (filter) {
        /// <summary>
        /// Change the current time of day filtering
        /// </summary>
        /// <param name="filter" type="Number">Period index to highlight</param>
        this.timeOfDayFilter[filter].filtered = !this.timeOfDayFilter[filter].filtered;


        this.updatePoints(false);
        this.updateTimeEnd();
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

    mobility_map.prototype.startAnimating = function () {
    	/// <summary>
    	/// Called when time animation is starting to block GUI functionality, etc.
    	/// </summary>
        this.animating = true;
        this.hideDetails();

        for (var i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i].count == 0) break;

            this.data.location[i].filtered = true;
        }

        this.gui.hideDetailFrame();
        this.gui.blockGui();

    };

    mobility_map.prototype.stopAnimating = function () {
    	/// <summary>
    	/// Called when time animation is stopped to unlock interactions
    	/// </summary>
        this.animating = false;
        this.gui.unblockGui();
    };

    mobility_map.prototype.setOverlayRef = function (ref) {
    	/// <summary>
    	/// Set the overlay layer reference
    	/// </summary>
    	/// <param name="ref" type="mobility-overlay"></param>
        this.overlayRef = ref;
    };

    mobility_map.prototype.reopenOverlay = function () {
    	/// <summary>
    	/// Go back to the simple mode by reopening the overlay
    	/// </summary>
     
        d3.select("#overlayLayer").style("visibility", "visible");
        this.gui.reset();
        this.hideDetails();
        this.dataStore.resetPoints();
        this.timelineRef.reset();        

        d3.select(".vislayer").selectAll(".locationPoint").remove();
        d3.select(".vislayer").selectAll(".connection").remove();

        this.overlayRef.reopenOverlay();
    };

    return mobility_map;

})();