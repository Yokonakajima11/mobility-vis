/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />

var mobility_map = (function () {

    function mobility_map(divId, lat, long) {
        /// <param name="divId" type="String"></param>
        /// <param name="lat" type="Number"></param>
        /// <param name="long" type="Number"></param>

        var chart = this;
        this.vis = d3.select("#" + divId).append("svg:svg");

        this.data = null;
        this.displayedData = null;
        this.map = po.map()
            .container(this.vis.append("g").attr("id", "map-container").node());
        this.zoom = 0;
        this.initialZoom;
        this.filterParam = 30;
        this.radiusScale = d3.scale.pow().exponent(0.3).range([4, 20]);
        this.colorScale = d3.scale.linear().range(["#e80c7a", "#FFF500"]).domain([0, 12]);
        this.parentId = divId;

        this.startTime = 0;
        this.endTime = 0;

        this.refPoint1 = null;
        this.refPoint2 = null;
        this.refDistance = 0;

        var n = Math.pow(2, 12);//zoom
        var xtile = ((long + 180) / 360) * n
        var ytile = (1 - (Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI)) / 2 * n

        this.map
            .add(po.interact())
            .add(po.image()
            .url(po.url("http://{S}tile.cloudmade.com"
            + "/b8dd6d159c1f4af48b74fc1a7c17a592"
            + "/123211/256/{Z}/{X}/{Y}.png")
            .hosts(["a.", "b.", "c.", ""])));
        this.map.add(po.compass()
             .pan("none"));


        d3.csv("data/newdata.csv", function (data) {

            // Insert our layer beneath the compass.
            chart.circleLayer = d3.select("svg").append("svg:g").attr("class", "vislayer");
            chart.timelineLayer = d3.select("svg").append("svg:g").attr("class", "timeline").attr("transform", "translate(" + (document.getElementById(chart.parentId).offsetWidth - 50) + ",30)");
            var staticGroup = d3.select("svg").append("svg:g").attr("class", "static").attr("transform", "translate(20," + (document.getElementById(chart.parentId).offsetHeight - 50) + ")");
            chart.drawStatic(staticGroup);

            chart.data = chart.filterPoints(data);
            chart.startTime = (chart.data.time[0].start+chart.data.time[chart.data.time.length - 1].end)/2;
            chart.endTime = chart.data.time[chart.data.time.length - 1].end;
            chart.timelineRef = new mobility_timeline(chart.timelineLayer, chart, chart.data.time[0].start, chart.data.time[chart.data.time.length - 1].end, chart.startTime);
            chart.updatePoints();


            // Whenever the map moves, update the marker positions.
            chart.map.on("move", function () { chart.onMapMove(chart) });

            chart.initialZoom = chart.zoom = chart.map.zoom();
            chart.refPoint1 = { lat: 55, lon: 56 };
            chart.refPoint2 = { lat: 56, lon: 56 };
            var p1 = chart.map.locationPoint(chart.refPoint1),
                p2 = chart.map.locationPoint(chart.refPoint2);
            chart.refDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        });


        this.map.center({ lat: 55.751849, lon: 12.535186 });

    };
    mobility_map.prototype.updatePoints = function () {


        var countDict = {};
        for (var i = 0; i < this.data.time.length; i++) {
            if (this.data.time[i].start > this.endTime)
                break;
            else if (this.data.time[i].start > this.startTime) {
                if (countDict[this.data.time[i].id] == undefined)
                    countDict[this.data.time[i].id] = { time: this.data.time[i].end - this.data.time[i].start, count: 1 };
                else {
                    countDict[this.data.time[i].id].time += this.data.time[i].end - this.data.time[i].start;
                    countDict[this.data.time[i].id].count += 1;
                }
            }
        }
        for (var i = 0; i < this.data.location.length; i++)
            if (countDict[this.data.location[i].id] == undefined) {
                this.data.location[i].count = 0;
                this.data.location[i].time = 0;
            }
            else {
                this.data.location[i].count = (countDict[this.data.location[i].id].count);
                this.data.location[i].time = (countDict[this.data.location[i].id].time)
            }

        this.data.location.sort(function (a, b) { return b.count - a.count; });
        var slice = 0
        for (var i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i].count == 0) break;
            this.data.location[i].time /= (this.data.location[i].count * 1000 * 60 * 60);
            //this.data.location[i].time /= (1000 * 60 * 60);
            slice = i + 1;
        }
        this.displayedData = this.data.location.slice(0, slice);




        this.drawPoints();

        this.drawConnections(500,0);

    };



    mobility_map.prototype.drawPoints = function () {
        var chart = this;
        var layer = d3.select(".vislayer");
        layer.selectAll("g").remove();
        var marker = layer.selectAll(".locationPoint")
             .data(this.displayedData, function (d) { return d.id });

        marker.exit().attr("r", 0).remove();

        var newMarkers = marker.enter().append("svg:g").attr("class","locationPoint")
             .attr("transform", transform);
        // Add a circle.
        newMarkers.append("svg:circle")
            .attr("class", "location")
            .attr("r", 0).style("fill-opacity", 0.7)
            .style("fill", this.colorScale(0))
        .style("stroke", "#E80C7A").style("stroke-width", 2);

        newMarkers.append("svg:text")
           .attr("class", "locationcount")
            .text(function (d) { return d.count })
            .style("fill", "#ffffff");

        newMarkers.append("svg:text")
           .attr("class", "locationtime")
            .text(function (d) { return d.time })
            .style("fill", "pink").attr("y", 20);
        newMarkers.append("svg:text")
           .attr("class", "locationid")
            .text(function (d) { return d.id })
            .style("fill", "blue").attr("y", -20);

        this.radiusScale.domain([d3.min(this.displayedData, function (d) {
            return d.count;

        }), d3.max(this.displayedData, function (d) {
            return d.count;

        })]);



        marker.selectAll("circle").transition().duration(100).attr("r", function (d) {
            return chart.radiusScale(d.count)
        }).style("fill", function (d) {
            return chart.colorScale(d.time)
        }).style("stroke", function (d) {
            return d3.rgb(chart.colorScale(d.time)).darker();
        });

        d3.selectAll(".locationcount").text(function (d) { return d.count });
        d3.selectAll(".locationtime").text(function (d) { return d.time });
        d3.selectAll(".locationid").text(function (d) { return d.id });

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
        
    };
   


    mobility_map.prototype.drawConnections = function (speed,delay) {
        var delay = 0;
        for (var i = 0; i < this.data.time.length - 1; i++) {
            if (this.data.time[i + 1].start > this.endTime)
                break;
            else if (this.data.time[i].start > this.startTime && this.data.time[i].id != this.data.time[i + 1].id)
                this.drawConnection(this.data.locDict[this.data.time[i].id], this.data.locDict[this.data.time[i + 1].id],speed,i*delay);

        }

    };


    mobility_map.prototype.drawConnection = function (pointA, pointB,speed,delay) {
        var chart = this;
        var parent = d3.select(".vislayer");
        var realA = chart.map.locationPoint(pointA);
        var realB = chart.map.locationPoint(pointB);
        

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


        var midPoint = {
            x: startPoint.x + (endPoint.x - startPoint.x) / 2 + vecLength / 5 * getRandom(0.2, 1) * perpendicular.x,
            y: startPoint.y + (endPoint.y - startPoint.y) / 2 - vecLength / 5 * getRandom(0.2, 1) * perpendicular.y
        };
        //var midPoint2 = {
        //    x: startPoint.x + (endPoint.x - startPoint.x) / 2 - vecLength / 10 * getRandom(5, 10) * perpendicular.x,
        //    y: startPoint.y + (endPoint.y - startPoint.y) / 2 + vecLength / 10 * getRandom(5, 10) * perpendicular.y
        //};

        //d3.select(".vislayer").append("g").attr("transform", transform(pointA))
        //    .append("line").attr("x1", midPoint.x).attr("y1", midPoint.y).attr("x2", midPoint2.x).attr("y2", midPoint2.y).style("stroke", "blue").style("stroke-width", "3px");

        var t = 0,
            delta = .01,
            padding = 10,
            points = [startPoint, midPoint,endPoint],
            bezier = {},
            line = d3.svg.line().x(x).y(y);

        var pathGroup = parent
            .append("svg:g").attr("id", "conn_" + pointA.id + "_" + pointB.id)
            .attr("class", "connection")
            .attr("transform", transform(pointA));


        var last = 0;
        d3.timer(function (elapsed) {
            if (elapsed > delay) {
                t = (t + (elapsed - delay - last) / speed);
                last = elapsed - delay;
                update();
                if (elapsed-delay >= speed*2)
                    return true;
            }

        });

        function update() {
            var curve = pathGroup.selectAll("path.curve");

                curve.data(getCurve).enter().append("svg:path")
                .attr("class", "curve")
            .style("fill", "none")
                .style("stroke", "red")
            .style("stroke-width", "3px");

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
            var curve = bezier[3];
            if (!curve) {
                curve = bezier[3] = [];
                for (var t_ = 0; t_ <= 1; t_ += delta) {
                    var x = getLevels(3, t_);
                    curve.push(x[x.length - 1][0]);
                }
            }
            return [curve.slice(0, t / delta + 1)];
        }

        function x(d) { return d.x; }
        function y(d) { return d.y; }

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }

    };

    mobility_map.prototype.drawStatic = function (parent) {


        var gradient = parent
            .append("linearGradient")
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("x1", 0)
            .attr("x2", 300)
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

        parent
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 300)
            .attr("height", 20)
            .attr("fill", "url(#gradient)");

        var ticks = parent.selectAll("line").data([0, 12, 24]).enter();
        ticks.append("line")
            .attr("x1", function (d, i) { return i * 150 })
            .attr("y1", 20)
            .attr("x2", function (d, i) { return i * 150 })
            .attr("y2", 25).style("stroke", "white");
        ticks.append("text").text(function (d) { return d })
            .attr("x", function (d, i) { return (i * 150) - 7 })
            .attr("y", 38)
            .style("fill", "white");

    };


    mobility_map.prototype.onMapMove = function (chart) {
        chart.zoom = chart.map.zoom();

        var p1 = chart.map.locationPoint(chart.refPoint1),
            p2 = chart.map.locationPoint(chart.refPoint2);
        var newRefDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

        d3.select(".vislayer").selectAll(".locationPoint").attr("transform", transform);
        d3.select(".vislayer").selectAll(".connection").attr("transform", function () {
            var id = +(this.getAttribute("id").split("_")[1]);
            var scale = newRefDistance / chart.refDistance;

            
            return transform(chart.data.locDict[id])+ " scale(" + scale + ")";
        });
        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };


    mobility_map.prototype.filterPoints = function (data) {
        var chart = this;
        var filteredData = [];
        var timeData = [];
        var locDict = {};
        var dict = {};

        //grouping pois with the same ID
        
        for (var i = 0; i < data.length; i++) {
            if (dict[data[i].id] == undefined) {
                dict[data[i].id] = [data[i]];
                
            }
            else
                dict[data[i].id].push(data[i])
            timeData.push({ id: data[i].id, start: data[i].arrival * 1000, end: data[i].departure * 1000 });
        }
        //counting average of pois location
        for (var id in dict) {
            var point = dict[id];
            var averagePoint = {
                lat: d3.mean(point, function (d) { return d.lat }),
                lon: d3.mean(point, function (d) { return d.lon }),
                count: 0,
                time: 0,
                id: id
                // visits: point.map(function (d) { return { start: d.arrival, end: d.departure } })
            };

            locDict[id] = averagePoint;
            filteredData.push(averagePoint);
        }

        return { location: filteredData, time: timeData, locDict: locDict };


    };

    mobility_map.prototype.updateTime = function (start, end) {
        this.startTime = start;
        this.endTime = end;
        this.updatePoints();
    };

    mobility_map.prototype.timeTick = function () {
        this.startTime += 1000 * 60 * 60 * 24;
        this.endTime += 1000 * 60 * 60 * 24;
        this.updatePoints();

    };


    mobility_map.prototype.redraw = function () {
        var chart = this;
        this.onMapMove(chart);
        this.timelineLayer.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 50) + ",30)");
    };

    return mobility_map;

})();