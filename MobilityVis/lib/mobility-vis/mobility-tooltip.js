/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />

var mobility_tooltip = (function () {

    function mobility_tooltip(parenContainer, data) {

        this.parent = parenContainer;
        this.radialChart = null;
        /// <field type="mobility_point">The data point for the tooltip</field>
        this.data = data;


        this.startRadius = 25;
        this.midRadius = 15;

        this.radialColorScale = d3.scale.linear().range(["#ffffff", "#e80c7a"]).clamp(true);

        this.timesOfDay = [{ from: 0, to: 6, label: "Dusk"},
                               { from: 6, to: 12, label: "Morning"},
                               { from: 12, to: 18, label: "Afternoon"},
                               { from: 18, to: 22, label: "Evening"},
                               { from: 22, to: 24, label: "Night"}];

        this.updateData();
        this.draw();
    };

    mobility_tooltip.prototype.draw = function () {
        var that = this;

        this.parent.append("rect")
           // .attr("rx", 6)
           //.attr("ry", 6)
           .attr("x", 0)
           .attr("y", 0)
           .attr("width", 700)
           .attr("height", 500)
           .attr("id", "mainFrame")
           .attr("class", "tile");

       
        this.radialChart = this.parent.append("g").attr("class", ".radialChart");

        this.radialChart.selectAll(".dayWheel").data(this.data.buckets.reverse()).enter()
            .append("g")
            .attr("class", "dayWheel")
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.data.buckets[i].timeBucket).enter()
                    .append("path")
                    .attr("d", d3.svg.arc()
                                    .innerRadius(function () {
                                        return that.startRadius + that.midRadius * i;
                                    })
                                    .outerRadius(function () {
                                        return that.startRadius + that.midRadius * (i + 1);
                                    })
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 24;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 24;

                                    }))
                    .attr("fill", function (d) { return that.radialColorScale(d.total) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px")
                    .attr("id", function(d,j) {return "slice-" + i + "-" + j});
            })
            .append("text")
            .attr("x", -5)
            .attr("y", function (d, i) { return -(that.startRadius + i * that.midRadius + 2) })
            .text(function (d) { return d.day.substr(0,2) })
            .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");
        this.radialChart.attr("transform", "translate(175,300)");

        this.radialChart.selectAll(".dayLabel").data(this.data.buckets[0].timeBucket).enter()
        .append("text")
        .attr("class", "hourLabel")
        .attr("x", function (d, i) { return (that.midRadius * 8 + that.startRadius) * Math.cos(((2 * Math.PI) * i) / 24 - Math.PI / 2) - 3; })
        .attr("y", function (d, i) { return (that.midRadius * 8 + that.startRadius) * Math.sin(((2 * Math.PI) * i) / 24 - Math.PI / 2) + 3;})
        .text(function (d, i) { return i })
        .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");

        this.radialChart2 = this.parent.append("g").attr("class", ".radialChart2");

        this.radialChart2.selectAll(".dayWheel").data(this.timesOfDay).enter()
            .append("g")
            .attr("class", "dayWheel")
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.data.buckets).enter()
                    .append("path")
                    .attr("d", d3.svg.arc()
                                    .innerRadius(function () {
                                        return that.startRadius + (that.midRadius * 1.5) * i;
                                    })
                                    .outerRadius(function () {
                                        return that.startRadius + (that.midRadius * 1.5) * (i + 1);
                                    })
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 7;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 7;

                                    }))
                    .attr("fill", function (e, j) { return that.radialColorScale(that.sumBuckets(j, d.from, d.to)) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px")
               
            })
         .append("text")
                .attr("x", -5)
                .attr("y", function (d, i) { return -(that.startRadius + i * (that.midRadius * 1.5) + 2) })
                .text(function (d) { return d.label })
                .style("stroke", "none")
                .style("fill", "black")
                .style("font-size", "12px");;
        this.radialChart2.attr("transform", "translate(500,300)");

        this.radialChart2.selectAll(".dayLabel").data(this.data.buckets).enter()
        .append("text")
        .attr("class", "dayLabel")
        .attr("x", function (d, i) { return (that.midRadius * 1.5 * 5 + that.startRadius) * Math.cos(((2 * Math.PI) * i)/7 - 2*Math.PI/7) - 20})
        .attr("y", function (d, i) { return (that.midRadius * 1.5 * 5 + that.startRadius) * Math.sin(((2 * Math.PI) * i) / 7 - 2*Math.PI / 7) })
        .text(function (d) { return d.day })
        .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");

    };

    mobility_tooltip.prototype.sumBuckets = function (day, start, end) {
        var sum=0;

        for (var i = start; i < end; i++)
            sum += this.data.buckets[day].timeBucket[i].total;

        return sum/(end-start-1);
    }

    mobility_tooltip.prototype.updateData = function () {

        //for (var i = 0; i < 7; i++) {
        //    this.bucketedData[i].total = 0;
        //    for (var j = 0; j < this.bucketedData[i].timeBucket.length; j++) {
        //        this.bucketedData[i].timeBucket[j] = { count: 0, total: 0, avg: 0 };
        //    }
        //}

        //for (var i = 0; i < this.data.visits.length; i++) {
        //    this.bucketData(this.data.visits[i].start, this.data.visits[i].end);
        //}

        this.radialColorScale.domain([d3.min(this.data.buckets, function (f) { return d3.min(f.timeBucket, function (tb) { return tb.total }) }),
            d3.max(this.data.buckets, function (f) { return d3.max(f.timeBucket, function (tb) { return tb.total }) })
        ]);


    };
    
    return mobility_tooltip;

})();