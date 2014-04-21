/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />

var mobility_tooltip = (function () {

    function mobility_tooltip(parentContainer, data, width, height, closeFun) {

        this.parent = parentContainer;
        this.radialChart = "#dayHourRadial";
        /// <field name="data" type="mobility_point">The data point for the tooltip</field>
        this.data = data;
        this.closeFun = closeFun;

        this.width = width;
        this.height = height;

        this.startRadius = 25;
        this.midRadius = 15;

        this.radialColorScale = d3.scale.linear().range(["#ffffff", "#e80c7a"]).clamp(true);

        this.timesOfDay = [{ from: 0, to: 6, label: "Dusk"},
                               { from: 6, to: 12, label: "Morning"},
                               { from: 12, to: 18, label: "Afternoon"},
                               { from: 18, to: 22, label: "Evening"},
                               { from: 22, to: 24, label: "Night"}];

        this.update();
        this.draw();
        this.drawInfo();
        this.drawRadialCharts();

    };

    mobility_tooltip.prototype.draw = function () {
        var that = this;

        this.parent.append("rect")
           .attr("x", 0)
           .attr("y", 0)
           .attr("width", this.width)
           .attr("height", this.height)
           .attr("id", "mainFrame")
           .attr("class", "tile");

        var openGrp = this.parent.append("g")
       .on("click", function () {  
           that.closeFun();
       })
       .on("mouseover", function () {
           d3.select(this).select("polyline").style("fill", "#FFFFFF");
           d3.select(this).select("text").style("fill", "#FFFFFF");
       })
       .on("mouseout", function () {
           d3.select(this).select("polyline").style("fill", "#eeeeee");
           d3.select(this).select("text").style("fill", null);
       });;

        openGrp.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.width)
            .attr("height", 20)
            .style("opacity", 0);

        openGrp.append("text")
            .attr("y", 18)
            .attr("x", this.width/2 - 30)
            .text("Details");

        openGrp.append("polyline")
           .attr("points", "-5,-5 5,0 -5,5")
           .attr("transform", "translate(" + (this.width/2 + 30) + ",12) rotate(90)")
           .style("fill", "#eeeeee");
    };

    
    mobility_tooltip.prototype.drawInfo = function () {
        var that = this;


        var ttGrp = this.parent.append("g").attr("id", "tooltipInfo");
        var texts = ["Location ID: " + this.data.id,
                     "Visits: " + this.data.count,
                     "Total time spent: " + this.formatTime(this.data.time),
                     "Average time spent: " + Math.round(this.data.avgTime * 100) / 100 + "h"];


        ttGrp.append("text")
            .attr("y", 0)
            .selectAll("tspan").data(texts).enter()
            .append("tspan")
            .attr("dy", 14)
            .attr("x", 0)
            .text(function (t) { return t; });

        ttGrp.attr("transform", "translate(10,10)");
    };

    mobility_tooltip.prototype.drawRadialCharts = function () {
        var that = this;

        var radialChartsGrp = this.parent.append("g").attr("id", "radialChartGrp");
        var radialChart = radialChartsGrp.append("g").attr("class", "radialChart").attr("id", "dayHourRadial");
        var bucketCount = this.data.buckets.length;

        var dayCircles = radialChart.selectAll(".dayWheel").data(this.data.buckets).enter()

        dayCircles.append("g")
            .attr("class", "dayWheel")
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.data.buckets[i].timeBucket).enter()
                    .append("path")
                    .attr("d", d3.svg.arc()
                                    .innerRadius(function () {
                                        return that.startRadius + that.midRadius * (bucketCount - i - 1);
                                    })
                                    .outerRadius(function () {
                                        return that.startRadius + that.midRadius * ((bucketCount - i - 1) + 1);
                                    })
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 24;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 24;

                                    }))
                    .attr("fill", function (e) { return that.radialColorScale(e.total) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px")
                    .attr("id", function (e, j) { return "slice-" + (bucketCount - i - 1) + "-" + j })
                    .on("mouseover", function (e, j) {
                        d3.select(this)
                            .transition()
                            .style("stroke-width", "4px");                            
                        d3.select("#radialHoverText")
                            .text(e.count + " " + (e.count==1?"visit":"visits") + " on " + d.day + " at " + (j < 13 ? (j + " am") : ((j - 12) + " pm")));
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .style("stroke-width", "0.3px");
                        d3.select("#radialHoverText").text("");
                    });
            });

        dayCircles.append("def").append("path")
            .attr("d", d3.svg.arc().innerRadius(function (d, i) {
                                        return that.startRadius + that.midRadius * (bucketCount - i - 1) + 4;
                                    })
                                    .outerRadius(function (d, i) {
                                        return that.startRadius + that.midRadius * (bucketCount - i - 1) + 4;
                                    })
                                    .startAngle(0)
                                    .endAngle(Math.PI))
            .attr("id", function(d,i) {return "weekTextPath-" + i});
        
        dayCircles.append("text")
            .attr("class", "nohover")
            .append("textPath")
            .attr("xlink:href", function (d, i) { return "#weekTextPath-" + i })
            .text(function (d) { return d.day })
            .style("fill", "black")
            .style("opacity", 0.55)
            .style("font-size", "11px");

        var hourLabels = radialChart.selectAll(".hourLabel").data(this.data.buckets[0].timeBucket).enter();
        hourLabels.append("def").append("path")
            .attr("d", d3.svg.arc().innerRadius(that.startRadius + that.midRadius * 7 + 4)
                                    .outerRadius(that.startRadius + that.midRadius * 7 + 4)
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 24;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 24;

                                    }))
            .attr("id", function (e,j) { return "hourTextPath-" + j })

        hourLabels.append("text")
            .attr("class", "hourLabel")
            .append("textPath")            
            .attr("xlink:href", function (e,j) { return "#hourTextPath-" + j })
            .text(function (e,j) { return j<13?(j + " am"):((j-12) + " pm") })
            .style("stroke", "none")
            .style("font-size", "12px");

        var radialChart2 = radialChartsGrp.append("g").attr("class", "radialChart").attr("id", "todDayRadial");

        var todWheel = radialChart2.selectAll(".todWheel").data(this.timesOfDay).enter();

        todWheel.append("g")
            .attr("class", "todWheel")
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
                    .attr("fill", function (e, j) { return that.radialColorScale(that.data.sumBuckets(j, d.from, d.to)) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px")
                    .on("mouseover", function (e, j) {
                        var timeSpent = that.data.sumBucketsNoCorrection(j, d.from, d.to);

                        d3.select(this)
                            .transition()
                            .style("stroke-width", "4px");
                        d3.select("#radialHoverText")
                            .text(Math.round(timeSpent * 100) / 100 + "h in total on " + e.day + " " + d.label + "s");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .style("stroke-width", "0.3px");
                        d3.select("#radialHoverText").text("");
                    });

            });

        todWheel.append("def").append("path")
            .attr("d", d3.svg.arc().innerRadius(function (d, i) {
                                        return that.startRadius + (that.midRadius * 1.5) * i + 4;
                                    })
                                    .outerRadius(function (d, i) {
                                        return that.startRadius + (that.midRadius * 1.5) * i + 4;
                                    })
                                    .startAngle(0)
                                    .endAngle(Math.PI))
            .attr("id", function (d, i) { return "todTextPath-" + i });

        todWheel.append("text")
            .attr("class", "nohover")
            .append("textPath")
            .attr("xlink:href", function (d, i) { return "#todTextPath-" + i })
            .text(function (d) { return d.label })
            .style("fill", "black")
            .style("opacity", 0.55)
            .style("font-size", "11px");


        var dayLabels = radialChart2.selectAll(".dayLabel").data(this.data.buckets).enter();
        dayLabels.append("def").append("path")
            .attr("d", d3.svg.arc().innerRadius(that.midRadius * 1.5 * 5 + that.startRadius + 4)
                                    .outerRadius(that.midRadius * 1.5 * 5 + that.startRadius + 4)
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 7 + (Math.PI/7)/2;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 7 + (Math.PI / 7) / 2;

                                    }))
            .attr("id", function (e, j) { return "dayTextPath-" + j })

        dayLabels.append("text")
            .attr("class", "dayLabel")
            .append("textPath")
            .attr("xlink:href", function (e, j) { return "#dayTextPath-" + j })
            .text(function (e, j) { return e.day })
            .style("stroke", "none")
            .style("font-size", "12px");        

        var switchBtnGrp = radialChartsGrp.append("g")
            .attr("id", "switchButton")
            .on("click", function () {
                d3.selectAll(".radialChart")
                    .style("visibility", "visible");
                d3.select(that.radialChart)
                    .style("visibility", "hidden");

                if (that.radialChart == "#dayHourRadial")
                    that.radialChart = "#todDayRadial";
                else
                    that.radialChart = "#dayHourRadial";
            })
            .on("mouseover", function () {
                d3.select(this).select("rect").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("rect").style("fill", null);
            });

        switchBtnGrp.append("rect")
            .attr("x", -2.5)
            .attr("y", -2.5)
            .attr("width", 20)
            .attr("height", 20)
           .attr("class", "tile");

        switchBtnGrp.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", "#eeeeee");

        var hoverText = radialChartsGrp.append("text")
            .attr("id", "radialHoverText")
            .attr("x", 0)
            .attr("y", 0)
            .text("");

        var scaleGrp = radialChartsGrp.append("g")
            .attr("class", "radialScale");         

        var gradient = scaleGrp.append("linearGradient")
            .attr("y1", 0)
            .attr("y2", 260)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("id", "radialGradient")
            .attr("gradientUnits", "userSpaceOnUse");

        gradient
            .append("stop")
            .attr("offset", "0")
            .attr("stop-color", "#e80c7a");

        gradient
            .append("stop")
            .attr("offset", "1")
            .attr("stop-color", "#ffffff");

        scaleGrp
            .append("rect")
            .attr("x", 10)
            .attr("y", 15)
            .attr("width", 4)
            .attr("height", 260)
            .attr("fill", "url(#radialGradient)");

        scaleGrp.append("text")
            .attr("x", 0)
            .attr("y", 7)
            .text("More")
            .style("font-size", "11px");

        scaleGrp.append("text")
            .attr("x", 3)
            .attr("y", 290)
            .text("Less")
            .style("font-size", "11px");

        var titleText = radialChartsGrp.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .text("Visits distribution")
            .style("font-size", "18px");

        switchBtnGrp.attr("transform", "translate(20," + (this.height - 350) + ")");
        radialChart.attr("transform", "translate(175," + (this.height - 200) + ")");
        radialChart2.attr("transform", "translate(175," + (this.height - 200) + ")")
            .style("visibility", "hidden");
        hoverText.attr("transform", "translate(20," + (this.height - 30) + ")");
        scaleGrp.attr("transform", "translate(330," + +(this.height - 345) + ")");
        titleText.attr("transform", "translate(120," + +(this.height - 370) + ")");

        
    };

    mobility_tooltip.prototype.update = function () {
        var that = this;
        this.radialColorScale.domain([d3.min(this.data.buckets, function (f) { return d3.min(f.timeBucket, function (tb) { return tb.total }) }),
            d3.max(this.data.buckets, function (f) { return d3.max(f.timeBucket, function (tb) { return tb.total }) })
        ]);

        d3.selectAll(".dayWheel").data(this.data.buckets)
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.data.buckets[i].timeBucket)
                    .attr("fill", function (e) { return that.radialColorScale(e.total) })
            });

        d3.selectAll(".todWheel").data(this.timesOfDay)
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.data.buckets)
                    .attr("fill", function (e, j) { return that.radialColorScale(that.data.sumBuckets(j, d.from, d.to)) })
            });

        var texts = ["Location ID: " + this.data.id,
                     "Visits: " + this.data.count,
                     "Total time spent: " + this.formatTime(this.data.time),
                     "Average time spent: " + Math.round(this.data.avgTime * 100) / 100 + "h"];


        d3.select("#tooltipInfo")
            .selectAll("tspan").data(texts)
            .text(function (t) { return t; });


    };
    
    mobility_tooltip.prototype.formatTime = function (time) {
        var hours = Math.floor(time / (1000 * 60 * 60));
        time -= hours * (1000 * 60 * 60);
        var minutes = Math.floor(time / (1000 * 60));
        time -= minutes * (1000 * 60);
        var seconds = Math.floor(time / 1000);

        return hours + "h " + minutes + "min " + seconds + "s";

    };

    return mobility_tooltip;

})();