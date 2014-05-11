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


        this.radiusScale = d3.scale.pow().exponent(0.3).range([3, 10]).domain([1, 100]);



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
        var diameter = 900;

        var tree = d3.layout.tree()
            .size([360, diameter / 2 - 120])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        var diagonal = d3.svg.diagonal.radial()
            .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

        var svg = this.visLayer
          .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

        
            var nodes = tree.nodes(this.graphData),
                links = tree.links(nodes);

            var link = svg.selectAll(".link")
                .data(links)
              .enter().append("path")
                .attr("class", "link")
                .attr("d", diagonal);

            var node = svg.selectAll(".node")
                .data(nodes)
              .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })

            node.append("circle")
                .attr("r", function (d) {
                    return chart.radiusScale(d.point.count);
                });

            node.append("text")
                .attr("dy", ".31em")
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
                .text(function(d) { return d.point.locationName; });


    };

    mobility_overlay.prototype.drawCalendar = function () {
        var weeks = [{ nr: 23, days: [] },
            { nr: 24, days: [] },
            { nr: 25, days: [] },
            { nr: 26, days: [] },
            { nr: 27, days: [] },
            { nr: 28, days: [] },
            { nr: 30, days: [] },
            { nr: 31, days: [] },
            { nr: 32, days: [] },
            { nr: 33, days: [] }];

        var colorScale = d3.scale.category10().domain([1, 10]);

        weeks.forEach(function (w) {
            for (var i = 0; i < 7; i++)
                w.days.push(genRandomDay());

            console.log(w);
        });

        var DoW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        var calGrp = this.visLayer.append("g")
            .attr("transform", "translate(1000, 500)");

        calGrp.selectAll(".dow").data(DoW).enter().append("g")
            .append("text")
            .attr({
                x: function (d, i) { return (24*i*5) + (12*5)},
                y: 10
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

        
        var dayGrps = weekGrps.selectAll("g").data(function (d) { return d.days }).enter()
            .append("g")
            .attr("transform", function(d,i) { return "translate("+ (i * 5*24) +",0)";}) ;

        dayGrps.append("line")
            .attr({
                x1: 0,
                x2: 0,
                y1: 0,
                y2: 20
            })
            .style("stroke", "white")
            .style("stroke-width", "2px")
            

        dayGrps.selectAll("rect").data(function(d) { return d}).enter()
            .append("rect")
            .attr({
                x: function (d, i) { return i * 5 },
                y: 0,
                height: 15,
                width: 5
            })
            .style("fill", function (d) {
                if (d == -1)
                    return "none";
                return colorScale(d)
            });


        function genRandomDay() {
            var sum = 0;
            var day = [];
            
            while (day.length < 24) {
                var hours = random(1, 24 - day.length);
                //alert("hours: " + hours + " day.length " + day.length);
                for (var i = 0; i < hours; i++) {
                    var loc = random(1, 10)
                    day.push((loc>4)?-1:loc);
                }
            }
            return day;
        };

        function random(a,b) {

            return Math.floor((Math.random() * b) + a)
        };

    };

    mobility_overlay.prototype.drawInfo = function () {
        var infoGrp = this.visLayer.append("g").attr("class", "info");

        var ttGrp = infoGrp.append("g").attr("id", "tooltipInfo");
        var texts = ["Top 5 locations", 
                     this.dataStore.data.location[0].locationName,
                     this.dataStore.data.location[1].locationName,
                     this.dataStore.data.location[2].locationName,
                     this.dataStore.data.location[3].locationName,
                     this.dataStore.data.location[4].locationName];


        ttGrp.append("text")
            .attr("y", 36 + 28)
            .selectAll("tspan").data(texts).enter()
            .append("tspan")
            .attr("dy", 36)
            .attr("x", 7)
            .text(function (t) { return t; })
.style("font-size", "36");

      
            

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