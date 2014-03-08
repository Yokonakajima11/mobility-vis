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
        this.filterParam = 30;
        this.radiusScale = d3.scale.pow().exponent(0.3).range([4, 20]);
        this.parentId = divId;

        this.startTime = 0;
        this.endTime = 0;
        

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

            chart.data = chart.filterPoints(data);
            chart.startTime = chart.data.time[0].start;
            chart.endTime = chart.data.time[chart.data.time.length - 1].end;
            chart.timelineRef = new mobility_timeline(chart.timelineLayer, chart, chart.startTime, chart.endTime);
            chart.updatePoints();


            // Whenever the map moves, update the marker positions.
            chart.map.on("move", function () { chart.onMapMove(chart) });

            chart.zoom = chart.map.zoom();
        });


        this.map.center({ lat: 55.751849, lon: 12.535186 });

    };
    mobility_map.prototype.updatePoints = function () {
        

        var countDict = {};
        for (var i = 0; i < this.data.time.length; i++)
        {
            if (this.data.time[i].start > this.endTime)
                break;
            else if (this.data.time[i].start > this.startTime) {
                if (countDict[this.data.time[i].id] == undefined)
                    countDict[this.data.time[i].id] = this.data.time[i].end-this.data.time[i].start;
                else
                    countDict[this.data.time[i].id] += this.data.time[i].end - this.data.time[i].start;
            }
        }
        for (var i = 0; i < this.data.location.length; i++)
            this.data.location[i].count = (countDict[this.data.location[i].id] || 0);

        this.data.location.sort(function (a, b) { return b.count - a.count; });
        var slice = 0
        for (var i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i].count == 0) break;
            slice = i + 1;
        }
        this.displayedData = this.data.location.slice(0, slice);




        this.drawPoints();
    };

    mobility_map.prototype.drawPoints = function () {
        var chart = this;
        var layer = d3.select(".vislayer");

        var marker = layer.selectAll("g")
             .data(this.displayedData, function (d) { return d.id });

        marker.exit().attr("r", 0).remove();

        var newMarkers = marker.enter().append("svg:g")
             .attr("transform", transform);
        // Add a circle.
        newMarkers.append("svg:circle")
            .attr("class", "location")
            .attr("r", 0).style("fill-opacity",  0.5)
            .style("fill", "#E80C7A")
        .style("stroke", "#E80C7A").style("stroke-width",2);

        newMarkers.append("svg:text")
            .attr("class", "location")
            .text(function (d) { return d.count })
            .style("fill", "#ffffff");

        this.radiusScale.domain([d3.min(this.displayedData, function (d) {
            return d.count;

        }), d3.max(this.displayedData, function (d) {
            return d.count;

        })]);



        marker.selectAll("circle").transition().duration(10).attr("r", function (d) {
            return chart.radiusScale(d.count)
        });

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };


    mobility_map.prototype.onMapMove = function (chart) {
        var layer = d3.select(".vislayer").selectAll("g").attr("transform", transform);
        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };


    mobility_map.prototype.filterPoints = function (data) {
        var chart = this;
        var filteredData = [];
        var timeData = [];
        var groupedDict = {};
        var dict = {};
        //var clusters = clusterfck.hcluster(data, function (a, b) {
        //    var aCoords = chart.map.locationPoint({ lon: a.lon, lat: a.lat });
        //    var bCoords = chart.map.locationPoint({ lon: b.lon, lat: b.lat });

        //    //return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lon - b.lon, 2));                    

        //    return Math.sqrt(Math.pow(aCoords.x - bCoords.x, 2) + Math.pow(aCoords.y - bCoords.y, 2));

        //}, clusterfck.SINGLE_LINKAGE, this.filterParam);
        //

        //for (var i = 0; i < clusters.length; i++) {
        //    clusters[i].canonical["size"] = clusters[i].size;
        //    filteredData.push(clusters[i].canonical);
        //}

        //grouping pois with the same ID

        for (var i = 0; i < data.length; i++)
        {
            if (dict[data[i].id] == undefined)
                dict[data[i].id] = [data[i]];
            else
                dict[data[i].id].push(data[i])
            timeData.push({ id: data[i].id, start: data[i].arrival * 1000, end: data[i].departure * 1000 });
        }
        //counting average of pois location
        for (var id in dict)
        {
            var point = dict[id];
            var averagePoint = {
                lat: d3.mean(point, function (d) { return d.lat }),
                lon: d3.mean(point, function (d) { return d.lon }),
                count: 0,
                id: id
               // visits: point.map(function (d) { return { start: d.arrival, end: d.departure } })
            };
            filteredData.push(averagePoint);
        }

        return { location: filteredData, time: timeData};


    };

    mobility_map.prototype.updateTime = function (start, end) {
        this.startTime = start;
        this.endTime = end;
        this.updatePoints();
    };


    mobility_map.prototype.redraw = function () {
        var chart = this;
        var layer = d3.select(".vislayer").selectAll("g").attr("transform", transform);
        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
        this.timelineLayer.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 50) + ",30)");
    };

    return mobility_map;

})();