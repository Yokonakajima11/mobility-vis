/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// <reference path="mobility-gui.js" />
/// <reference path="mobility-datastore.js" />

var mobility_overlay = (function () {

    function mobility_overlay(divId, dataStore) {
        var chart = this;

        // <field name="vis" type="String">Parent container ID</field>
        this.parentId = divId;
        /// <field name="vis" type="d3.selection()">Main SVG </field>
        this.vis = d3.select("#" + divId).append("svg:svg");
        /// <field name="visLayer" type="d3.selection()">Visualisation layer</field>
        this.visLayer = null;

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

        /// <field name="dataStore" type="mobility_datastore">Reference to data storage</param>
        this.dataStore = dataStore;

        this.calendarPos = 0;
        this.colorScale = d3.scale.ordinal().range(["red", "blue", "green", "purple", "yellow"]);
        this.radiusScale = d3.scale.pow().exponent(0.3).range([3, 10]);
        this.tree = null;
        this.diagonal = d3.svg.diagonal.radial()
            //.source(function (d) {
            //    d.source["isSource"] = true; return d.source;
            //})
            //.target(function (d) { d.target["isSource"] = false; return d.target; })
            .projection(function (d) {
                
                //var offset = 0
                //var asdasdad = 0;
                //if (d.depth)
                //    asdasdad = (d.depth - 2) * 20
                //if (d.point)
                //    offset = 5 * d.point.locationName.length;
                //if (d.isSource)
                //    return [d.y + offset + asdasdad, d.x / 180 * Math.PI];
                //else {
                    
                //    return [(d.y + asdasdad), d.x / 180 * Math.PI];
                //}

                return [d.y, d.x / 180 * Math.PI];
            });


        this.vis.append("rect")
            .attr({
                x: 0,
                y: 0,
                width: document.getElementById(this.parentId).offsetWidth,
                height: document.getElementById(this.parentId).offsetHeight,
                id: "background",
                "class": "tile"

            })

        this.visLayer = this.vis.append("g").attr("class", "vislayer");


        addEventListener("dataReady", function (e) {
            //Data has been loaded - initialize


            // Establishing initial time
            chart.data = dataStore.data; //chart.filterPoints(data);
            chart.graphData = chart.dataStore.makeGraph();
            chart.dataStore.bucketData(function (d) { return true });

            var domain = [];
            for(var i = 0; i<5 && i<chart.data.location.length; i++)
                domain.push(chart.data.location[i].id);

            chart.colorScale.domain(domain);
            chart.radiusScale.domain(
                d3.extent(chart.data.location, function(f){return f.time}));

            chart.drawAll();
        });


    };

    
    mobility_overlay.prototype.drawAll = function () {

        this.drawTree();
        this.drawCalendar();
        this.drawInfo();

       
    };

    mobility_overlay.prototype.drawTree = function () {
        var chart = this;
        var diameter = 1020;

        this.tree = d3.layout.tree()
            .size([360, diameter / 2 - 120])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });      

        var svg = this.visLayer
            .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")")
            .attr("id", "treeGrp");

        var nodes = this.tree.nodes(this.graphData),
            links = this.tree.links(nodes);

        var link = svg.append("g").attr("id", "linkGrp").selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", this.diagonal);

        var node = svg.selectAll(".node")
            .data(nodes, function (d) { return d.point.id; })
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

        node.append("circle")
            .attr("r", function (d) {
                return chart.radiusScale(d.point.time);
            })
            .on("click", function (d) {
                chart.updateTree(d);
            })
            .style("fill", function (d) {
                if (chart.colorScale.domain().indexOf(d.point.id) != -1)
                    return chart.colorScale(d.point.id);
                else
                    return "white";
                
            });

        node.append("text")
            .attr("dy", ".31em")
            .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function (d) { return d.x < 180 ? "translate(12)" : "rotate(180)translate(-8)"; })
            .text(function (d) {
                return d.point.locationName.substr(0, 16) + (((d.point.locationName.length) > 16) ? "..." : "");
            })
    };

    mobility_overlay.prototype.updateTree = function (aNode) {
        this.graphData = this.dataStore.makeGraph(aNode.point);
        var chart = this;

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
                        .attr("d", chart.diagonal);

                    chart.visLayer.select("#treeGrp").selectAll(".node").append("text")
                        .attr("dy", ".31em")
                        .attr("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
                        .attr("transform", function (d) { return d.x < 180 ? "translate(12)" : "rotate(180)translate(-8)"; })
                        .text(function (d) {
                            return d.point.locationName.substr(0, 16) + (((d.point.locationName.length) > 16) ? "..." : "");
                        })
                    redrawn = true;
                }
            });

    };

    mobility_overlay.prototype.drawCalendar = function () {
        var weeks = [];
        var that = this;

        var startWeek = (new Date(this.dataStore.startTime)).getWeek();
        var startYear = (new Date(this.dataStore.startTime)).getFullYear();
        var endYear = (new Date(this.dataStore.endTime)).getFullYear();

        var bigGrp = this.visLayer.append("g")
            .attr({
                id: "calendarVis",
                transform: "translate(1050, 50)"
            })

        var calGrp = bigGrp.append("g")
            .attr({
                id: "calGrp"
            })
            .on("mousewheel", function () {
                that.calendarPos -= d3.event.wheelDelta;
                d3.select(this).transition()
                    .attr("transform", "translate(0," + that.calendarPos + ")");
            });
        calGrp.append("rect")
            .attr({
                x: 0,
                y: 0,
                width: 7 * 24 * 5,
                height: (endYear - startYear + 1)*52*15

            })
            .style("opacity", "1")

        for (var i = 0; i < 5 && i < this.data.location.length; i++) {

            var dayGrps = calGrp.selectAll(".stuff")
                .data(this.data.location[i].hourData).enter()
                .append("rect")
                .attr({
                    x: 0,
                    y: 0,
                    height: 14,
                    width: 5,
                    "class": "hourTick",
                    transform: function (d, i) {
                        var dDate = new Date(d.timestamp);
                        var dWeek = dDate.getWeek();
                        var dYear = dDate.getFullYear();

                        var dDoW = (dDate.getDay() + 6) % 7;
                        var dHour = dDate.getHours();

                        return "translate(" + (5 * (24 * dDoW + dHour)) + ","
                            + ((dYear - startYear) * 52 + dWeek) * 15 + ")";
                    }
                })
                .style("fill", this.colorScale(this.data.location[i].id));
        }
       

        var DoW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];


        bigGrp.selectAll(".dow").data(DoW).enter().append("g")
            .append("text")
            .attr({
                x: function (d, i) { return (24*i*5) + 40},
                y: 450
            })
            .text(function (d) { return d });
        
        var weekGrps = calGrp.selectAll(".weekGrp")
            .data(weeks).enter().append("g")
            .attr("transform", function(d,i) { return "translate(0,"+ ( 20 * i + 40) + ")";}) ;

        weekGrps.append("text")
            .attr({
                x: -30,
                y: 14
            })
            .text(function (d) { return d.nr });

        calGrp.selectAll(".weekLabel").data(d3.time.weeks(this.dataStore.startTime, this.dataStore.endTime)).enter()
            .append("text")
            .attr({
                x: 0,
                y: 0,

                transform: function (d) {
                    var dWeek = d.getWeek();
                    var dYear = d.getFullYear();
                    return "translate(-70," + (((dYear - startYear) * 52 + dWeek) * 15 + 15) + ")";
                }


            })
            .text(function (d) { return d3.time.format("%d %b %y")(d); });
       
        calGrp.selectAll("line").data([1, 2, 3, 4, 5, 6]).enter()
            .append("line")
            .attr({
                x1: function (d) { return d * 24 * 5; },
                x2: function (d) { return d * 24 * 5; },
                y1: 0,
                y2: (endYear - startYear + 1) * 52 * 15
            })
            .style("stroke", "white")
            .style("stroke-width", "2px");
            

       

    };

    mobility_overlay.prototype.drawInfo = function () {
        var chart = this;

        var infoGrp = this.visLayer.append("g").attr("class", "info");

        var ttGrp = infoGrp.append("g").attr("id", "tooltipInfo");
        var texts = [];
        for (var i = 0; i < 5 && i < chart.data.location.length; i++)
            texts.push(chart.data.location[i]);

        ttGrp.append("text")
            .attr({
                x: 0,
                y: 0
            })
            .text("Top 5 locations")
            .style("font-size", "36");

        var eachText = ttGrp.selectAll("g").data(texts).enter()
            .append("g")
            .attr("transform", function (d, i) {
                return "translate(0," + (i * 34 + 30) + ")"
            });


        eachText.append("text")
            .attr({
                x: 34,
                y: 20
            })
            .text(function (t) { return t.locationName; })
            .style("font-size", "24");

        eachText.append("rect")
            .attr({
                x: 0,
                y: 0,
                width: 24,
                height: 24
            })
            .style("fill", function (d, i) {
                return chart.colorScale(d.id)
            });

        

      
            

        ttGrp.attr("transform", "translate(1000,100)");
    };

    mobility_overlay.prototype.redraw = function () {
        d3.select("#background")
            .attr({
                width: document.getElementById(this.parentId).offsetWidth,
                height: document.getElementById(this.parentId).offsetHeight
            });


    };


    return mobility_overlay;

})();


// From http://weeknumber.net/how-to/javascript
Date.prototype.getWeek = function () {
    var date = new Date(this.getTime()); date.setHours(0, 0, 0, 0);


    // Thursday in current week decides the year. 
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1. 
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1. 
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}
