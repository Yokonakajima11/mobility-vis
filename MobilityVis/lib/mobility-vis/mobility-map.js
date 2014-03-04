/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />

var mobility_map = (function () {

    function mobility_map(divId, lat, long) {
        var chart = this;

        this.data = null;
        this.map = po.map()
            .container(d3.select("#" + divId).append("svg:svg").node());
        this.zoom = 0;
        this.filterParam = 30;
        this.radiusScale=d3.scale.linear().range([4.5,10]);


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
            var layer = d3.select(".map").insert("svg:g", ".compass").attr("class", "vislayer");
            chart.data = chart.filterPoints(data);
            chart.drawPoints();


            // Whenever the map moves, update the marker positions.
            chart.map.on("move", function () { chart.onMapMove(chart) });

            chart.zoom = chart.map.zoom();
        });


        this.map.center({ lat: 55.751849, lon: 12.535186 });

    };

    mobility_map.prototype.drawPoints = function () {
        var chart = this;
        d3.select(".vislayer").selectAll("g").remove();
        var layer = d3.select(".vislayer");

        var marker = layer.selectAll("g")
             .data(this.data)
           .enter().append("svg:g")
             .attr("transform", transform);

        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
        this.radiusScale.domain([d3.min(this.data,function(d){
            return d.count;
        
        }), d3.max(this.data,function(d){
            return d.count;
        
        })]);
        // Add a circle.
        marker.append("svg:circle")
            .attr("class", "location")
            .attr("r", function (d) {
                return chart.radiusScale(d.count)
            }).style("fill", "#E80C7A");

        marker.append("svg:text")
            .attr("class", "location")
            .text(function (d) { return d.id})
            .style("fill", "#ffffff");
    };


    mobility_map.prototype.onMapMove = function (chart) {
        if (chart.zoom != chart.map.zoom()) {
            chart.zoom = chart.map.zoom();
            chart.drawPoints();

        }
        var layer = d3.select(".vislayer").selectAll("g").attr("transform", transform);
        function transform(d) {
            d = chart.map.locationPoint({ lon: d.lon, lat: d.lat });
            return "translate(" + d.x + "," + d.y + ")";
        }
    };


    mobility_map.prototype.filterPoints = function (data) {
        var chart = this;
        var filteredData = [];
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
            if (dict[data[i].id] == undefined) 
                dict[data[i].id] = [data[i]];
            else
                dict[data[i].id].push(data[i])

        //counting average of pois location
        for (var id in dict)
        {
            var point = dict[id];
            var averagePoint = {
                lat: d3.mean(point, function (d) { return d.lat }),
                lon: d3.mean(point, function (d) { return d.lon }),
                count: point.length,
                id: id,
                visits: point.map(function (d) { return { start: d.arrival, end: d.departure } })
            };
            filteredData.push(averagePoint);

        }

        return filteredData;


    };

    return mobility_map;

})();