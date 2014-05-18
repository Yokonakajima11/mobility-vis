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

        this.colorScale = d3.scale.ordinal().range(["red", "blue", "green", "purple", "yellow"]);
        this.radiusScale = d3.scale.pow().exponent(0.3).range([3, 10]).domain([1, 100]);
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

            var domain = [];
            for(var i = 0; i<5 && i<chart.data.location.length; i++)
                domain.push(chart.data.location[i].id);

            chart.colorScale.domain(domain);

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
                return chart.radiusScale(d.point.count);
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