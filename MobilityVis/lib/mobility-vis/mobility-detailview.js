/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// 
/// ======================================================================================================
/// File: MOBILITY-DETAILVIEW.js
/// ======================================================================================================
/// <summary>
/// This class is represents the detail view of a single data point. 
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================


var mobility_detailview = (function () {

    function mobility_detailview(parentContainer, data, width, height, start, end, closeFun) {
    	/// <summary>
    	/// The constructor for the mobility_detailview object
    	/// </summary>
    	/// <param name="parentContainer" type="d3.selection">The selection of the parent container</param>
    	/// <param name="data" type="mobility_point">The data point to visualize in the detail view</param>
    	/// <param name="width" type="Number">Width of the detail view</param>
        /// <param name="height" type="Number">Height of the detail view</param>
        /// <param name="start" type="Number">Timestamp of the start of the period to visualize</param>
        /// <param name="end" type="Number">Timestamp of the end of the period to visualize</param>
    	/// <param name="closeFun" type="Object">Function that closes the detail view</param>

        /// <field name="parent" type="d3.selection">The selection of the parent SVG container</field>
        this.parent = parentContainer;
        /// <field name="width" type="Number">Width of the detail view</field>
        this.width = width;
        /// <field name="height" type="Number">Height of the detail view</field>
        this.height = height;
        /// <field name="closeFun" type="Object">The reference to the function that will close the detail view</field>
        this.closeFun = closeFun;

        /*----------------------------------------  Data    ------------------------------------------*/
        /// <field name="data" type="mobility_point">The data point for the tooltip</field>
        this.data = data;
        /// <field name="startTime" type="Number">Timestamp of the start of the period to visualize</field>
        this.startTime = start;
        /// <field name="endTime" type="Number">Timestamp of the end of the period to visualize</field>
        this.endTime = end;        

        /*---------------------------------  Sub-Visualizations    -----------------------------------*/        
        /// <field name="radialChart" type="String">Id of the radial chart container SVG group</field>
        this.radialChart = "#dayHourRadial";
        /// <field name="startRadius" type="Number">The inner radius of the radial chart visualization</field>
        this.startRadius = 25;
        /// <field name="midRadius" type="Number">The mid radius of each circle in the radial chart visualization</field>
        this.midRadius = 15;
        /// <field name="timesOfDay" type="Array">The data for various times of day</field>
        this.timesOfDay = [{ from: 0, to: 6, label: "Dusk" },
                               { from: 6, to: 12, label: "Morning" },
                               { from: 12, to: 18, label: "Afternoon" },
                               { from: 18, to: 22, label: "Evening" },
                               { from: 22, to: 24, label: "Night" }];
        /// <field name="radialColorScale" type="d3.scale">The scale for the colors on the radial chart</field>
        this.radialColorScale = d3.scale.linear().range(["#ffffff", "#e80c7a"]).clamp(true);

        /// <field name="barChart" type="Object">The information for the bar chart</field>
        this.barChart = {
            /// <field name="x" type="d3.scale">The x scale for the bar chart</field>
            x: null,
            /// <field name="y" type="d3.scale">The y scale for the bar chart</field>
            y: null,
            /// <field name="xAxis" type="d3.svg.axis">The x axis for the bar chart</field>
            xAxis: null,
            /// <field name="yAxis" type="d3.svg.axis">The y axis for the bar chart</field>
            yAxis: null,
            /// <field name="width" type="Number">The width of the bar chart/field>
            width: 550,
            /// <field name="height" type="Number">The height of the bar chart</field>
            height: 300,
            /// <field name="grp" type="d3.selection">The selection containg the bar chart</field>
            grp: null
        };

        /*--------------------------------------  Constructor    -------------------------------------*/
        this.update();
        this.draw();
        this.drawInfo();
        this.drawBarChart();
        this.drawRadialCharts();

        if ($.mlog)
            $.mlog.logEvent("mapDetailOpened");

    };

    /*----------------------------------------  Drawing methods    ------------------------------------*/
    mobility_detailview.prototype.draw = function () {
    	/// <summary>
    	/// Draw the detailed view.
    	/// </summary>
        var that = this;

        this.parent.append("rect")
           .attr("x", 0)
           .attr("y", 0)
           .attr("width", this.width)
           .attr("height", this.height)
           .attr("id", "mainFrame")
           .attr("class", "tile");

        var openGrp = this.parent.append("g")
            .attr("class", "button")
            .on("click", function () {
                if ($.mlog)
                    $.mlog.logEvent("mapDetailClosed");

                that.closeFun();
            })
            .on("mouseover", function () {
                d3.select(this).select("polyline").style("fill", "#FFFFFF");
                d3.select(this).select("text").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("polyline").style("fill", "#eeeeee");
                d3.select(this).select("text").style("fill", null);
            });

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
        
    mobility_detailview.prototype.drawInfo = function () {
    	/// <summary>
    	/// Draw the text information in the detailed view.
    	/// </summary>
        var that = this;

        var ttGrp = this.parent.append("g").attr("id", "tooltipInfo");
        var texts = ["Location ID: " + this.data.id,
                     "Visits: " + this.data.count,
                     "Total time spent: " + this.formatTime(this.data.time),
                     "Average time spent: " + Math.round(this.data.avgTime * 100) / 100 + "h"];

        ttGrp.append("text")
            .attr("y", 36+28)
            .selectAll("tspan").data(texts).enter()
            .append("tspan")
            .attr("dy", 14)
            .attr("x", 7)
            .text(function (t) { return t; });

        ttGrp.append("text")
            .attr({
                x: 5,
                y: 36+14
            })
            .text(this.data.locationName)
            .style("font-size", "36");

        ttGrp.attr("transform", "translate(10,10)");
    };
    
    /*--------------------------------------  Bar Chart methods    ------------------------------------*/
    mobility_detailview.prototype.drawBarChart = function () {
    	/// <summary>
    	/// Draw the bar chart in the detailed view.
    	/// </summary>
        var that = this;
        var data = [];
        
        this.barChart.grp = this.parent.append("g")
            .attr("class", "barChart");

        this.barChart.grp.append("rect")
           .attr({ x: 0, y: 0, height: 10, width: 10, "class": "tile" });

        var titleText = this.barChart.grp.append("text")
            .attr({ x: 0, y: 0, id: "barTitle" })
            .text("Visits over time")
            .style("font-size", "18px");

        this.barChart.grp.attr("transform", "translate(430," + (this.height - 350) + ")");
        titleText.attr("transform", "translate(230, -20)");

        this.barChart.x = d3.scale.ordinal().rangeBands([0, this.barChart.width], .5, 10);
        this.barChart.y = d3.scale.linear().range([this.barChart.height, 0]);

        this.barChart.y.domain([0, 24]);

        this.barChart.xAxis = d3.svg.axis()
           .scale(this.barChart.x)
           .orient("bottom")

        this.barChart.yAxis = d3.svg.axis()
            .scale(this.barChart.y)
            .orient("left")
            .ticks(12);

        this.barChart.grp.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.barChart.height + ")")
            .call(this.barChart.xAxis);

        this.barChart.grp.append("g")
            .attr("class", "y axis")
            .call(this.barChart.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Time spent (h)");

        var legend = this.barChart.grp.append("g")
            .attr({
                id: "barLegend",
                transform: "translate(" + this.barChart.width + ",0)"
            });

        var legendPos = legend.selectAll("barLegendPos")
            .data([ { color: "#e80c7a", text: "Weekdays" },
                    { color: "#ffffff", text: "Weekends" }])
            .enter()
            .append("g")
            .attr("class", "barLegendPos");
            
        legendPos.append("rect")
            .attr({
                x: 0,
                y: function (d, i) { return i * 20  },
                width: 10,
                height: 10
            })
            .style("fill", function (d) { return d.color; });
       
        legendPos.append("text")
            .attr({
                x: 12,
                y: function (d, i) { return i * 20 + 10 }
            })
            .text(function (d) { return d.text })
            .style("font-size", "11px");

        this.updateBarChart();
    };

    mobility_detailview.prototype.updateBarChart = function () {
    	/// <summary>
        /// Update the bar chart with new data (change of the displayed time period).
        /// Also unzooms the bar chart.
        /// </summary>
        var that = this;
        var firstDay = new Date(this.startTime);
        firstDay.setHours(0, 0, 0, 0);

        var allDays = d3.time.day.range(firstDay, this.endTime);
        var allMonths = [firstDay].concat(d3.time.month.range(this.startTime, this.endTime))

        this.barChart.x.domain(allDays);

        this.barChart.xAxis
            .tickValues(allMonths)
            .tickFormat(d3.time.format("%b %y"));

        this.barChart.grp.select(".x.axis")
           .call(this.barChart.xAxis);

        var allBars = this.barChart.grp.selectAll(".bar")
           .data(this.data.dayData, function (d) { return d.date });

        allBars.exit().remove();

        allBars.transition().duration(1000)
            .attr("x", function (d) {

                return that.barChart.x(d.date);
            })
            .attr("width", this.barChart.x.rangeBand())
            .attr("y", function (d) {
                return that.barChart.y(d.length);
            })
            .attr("height", function (d) {
                return that.barChart.height - that.barChart.y(d.length);
            }
            );

        allBars.enter().append("rect")
            .style("fill", function (d) {
                if (d.date.getDay() == 0 || d.date.getDay() == 6)
                    return "#ffffff";
                return "#e80c7a";
            })
            .attr({
                x: function (d) { return that.barChart.x(d.date); },
                width: this.barChart.x.rangeBand(),
                y: this.barChart.height,
                height: 0,
                "class": "bar"
            })
            .transition()
            .duration(1000)
            .attr("y", function (d) {
                return that.barChart.y(d.length);
            })
            .attr("height", function (d) { return that.barChart.height - that.barChart.y(d.length); }
            )       

        var bgButtons = this.barChart.grp.selectAll(".monthRec").data(allMonths);
        bgButtons.exit().remove();

        bgButtons.enter()
           .append("rect")
           .attr("class", "monthRec");

        bgButtons.attr({
               x: function (d) { return that.barChart.x(d); },
               y: 0,
               width: function (d, i) {
                   if (i == allMonths.length - 1)
                       return that.barChart.width - that.barChart.x(d)
                   return that.barChart.x(allMonths[i + 1]) - that.barChart.x(d);
               },
               height: that.barChart.height
           })
           .style("opacity", "0")
           .style("fill", "#FFFFFF")
           .on("mouseover", function () {
               d3.select(this).style("opacity", 0.1);
           })
           .on("mouseout", function () {
               d3.select(this).style("opacity", 0);
           })
           .on("click", function (d) {
               if ($.mlog)
                   $.mlog.logEvent("barChartEvent");
               that.zoomBarChart(d);
           });

        this.barChart.grp.selectAll(".fullRec").remove()

        this.barChart.grp
            .append("rect")
           .attr({
               x: 0,
               y: 0,
               height: this.barChart.height,
               width: this.barChart.width,
               "class": "fullRec"
           })
           .style("opacity", "0")
           .style("fill", "#FFFFFF")
           .on("mouseover", function () {
               d3.select(this).style("opacity", 0.1);
           })
           .on("mouseout", function () {
               d3.select(this).style("opacity", 0);
           })
           .on("click", function () {
               if ($.mlog)
                   $.mlog.logEvent("barChartEvent");
               that.updateBarChart();
           });

        this.barChart.grp.select("#barTitle").text("Visits over time");

        this.barChart.grp.select(".fullRec").style("visibility", "hidden");
        this.barChart.grp.select(".monthRec").style("visibility", "visible");
    };

    mobility_detailview.prototype.zoomBarChart = function (date) {
    	/// <summary>
    	/// Zoom the bar chart to display a single month.
    	/// </summary>
    	/// <param name="date"></param>
        var that = this;
        var startDate = new Date(+date);
        var endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0,0,0,0,1);

        var allDays = d3.time.days(startDate, endDate);
        var weeks = d3.time.weeks(startDate, endDate);
        var monthData = [];
        
        var aDate = new Date(+startDate);
        var i = 0;
        
        while (i < this.data.dayData.length && this.data.dayData[i].date < endDate) {
            if (this.data.dayData[i].date >= startDate)
                monthData.push(this.data.dayData[i]);
            i++;
        }
        
        this.barChart.x.domain(allDays);

        this.barChart.xAxis
           .tickValues([startDate].concat(weeks))
           .tickFormat(d3.time.format("%d"));

        this.barChart.grp.select(".x.axis")
           .call(this.barChart.xAxis);

        var newBars = this.barChart.grp.selectAll(".bar")
            .data(monthData, function (d) { return d.date });

        newBars.transition()
            .attr("x", function (d) {
                return that.barChart.x(d.date);
            })
            .attr("width", this.barChart.x.rangeBand());
        var format = d3.time.format("%B");

        this.barChart.grp.select("#barTitle").text("Visits over time - " + format(startDate));

        this.barChart.grp.select(".fullRec").style("visibility", "visible");
        this.barChart.grp.select(".monthRec").style("visibility", "hidden");

        newBars.exit().remove();

    };

    /*-------------------------------------  Radial Chart methods    ----------------------------------*/
    mobility_detailview.prototype.drawRadialCharts = function () {
    	/// <summary>
    	/// Draw the radial charts in the detailed view.
    	/// </summary>
        var that = this;

        var radialChartsGrp = this.parent.append("g").attr("id", "radialChartGrp");
        var radialChart = radialChartsGrp.append("g").attr("class", "radialChart").attr("id", "dayHourRadial");
        var bucketCount = this.data.buckets.length;

        // Draw the day-of-week hour-circles
        var dayCircles = radialChart.selectAll(".dayWheel").data(this.data.buckets).enter()
        var hoverTime = -1;


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
                        hoverTime = Date.now();
                        d3.select(this)
                            .transition()
                            .style("stroke-width", "4px");                            
                        d3.select("#radialHoverText")
                            .text(e.count + " " + (e.count==1?"visit":"visits") + " on " + d.day + " at " + (j < 13 ? (j + " am") : ((j - 12) + " pm")));
                    })
                    .on("mouseout", function () {
                        if (Date.now() - hoverTime > 500 && hoverTime != -1)
                            if ($.mlog)
                                $.mlog.logEvent("radialChartEvent");
                        hoverTime = -1;
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

        // Draw the time-of-day week-circles
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
                        hoverTime = Date.now();
                        var timeSpent = that.data.sumBucketsNoCorrection(j, d.from, d.to);

                        d3.select(this)
                            .transition()
                            .style("stroke-width", "4px");
                        d3.select("#radialHoverText")
                            .text(Math.round(timeSpent * 100) / 100 + "h in total on " + e.day + " " + d.label + "s");
                    })
                    .on("mouseout", function () {
                        if (Date.now() - hoverTime > 500 && hoverTime != -1)
                            if ($.mlog)
                                $.mlog.logEvent("radialChartEvent");
                        hoverTime = -1;
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
            .attr("class", "button")
            .on("click", function () {
                if ($.mlog)
                    $.mlog.logEvent("radialChartSwitch");

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

        // Draw the scale
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

    /*----------------------------------------  Utility methods    ------------------------------------*/
    mobility_detailview.prototype.update = function (start, end) {
    	/// <summary>
    	/// Update the detailed view with the new time period, updating all subvisualizations.
    	/// </summary>
    	/// <param name="start" type="Number">Timestamp of the start of the new time period</param>
        /// <param name="end" type="Number">Timestamp of the end of the new time period</param>
        var that = this;

        // Update the radial charts
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

        // Update the bar chart
        if (this.barChart.grp != null) {
            this.startTime = start;
            this.endTime = end;
            this.updateBarChart();
        }
        

        d3.select("#tooltipInfo")
            .selectAll("tspan").data(texts)
            .text(function (t) { return t; });
    };
    
    mobility_detailview.prototype.formatTime = function (time) {
    	/// <summary>
    	/// Helper function that formats the time into a string
    	/// </summary>
    	/// <param name="time" type="Number">Input timestamp</param>
    	/// <returns type="String">The output formatted string</returns>
        var hours = Math.floor(time / (1000 * 60 * 60));
        time -= hours * (1000 * 60 * 60);
        var minutes = Math.floor(time / (1000 * 60));
        time -= minutes * (1000 * 60);
        var seconds = Math.floor(time / 1000);

        return hours + "h " + minutes + "min " + seconds + "s";

    };

    return mobility_detailview;

})();