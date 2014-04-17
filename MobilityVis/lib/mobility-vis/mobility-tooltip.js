/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />

var mobility_tooltip = (function () {

    function mobility_tooltip(parenContainer, data) {

        this.parent = parenContainer;
        this.radialChart = null;
        this.data = data;

        this.bucketedData = [{ day: "Monday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Tuesday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Wednesday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Thursday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Friday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Saturday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] },
                                { day: "Sunday", total: 0, timeBucket: [{ count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }, { count: 0, total: 0 }] }];

        this.timeOfDayFilter = [{ from: 0, to: 6, label: "night"},
                                { from: 6, to: 12, label: "morning"},
                                { from: 12, to: 18, label: "afternoon"},
                                { from: 18, to: 22, label: "evening"},
                                { from: 22, to: 24, label: "night" }];

        this.startRadius = 10;
        this.midRadius = 15;

        this.radialColorScale = d3.scale.linear().range(["#ffffff", "#e80c7a"]).clamp(true);
        

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
           .attr("class", "box");

        var timesOfDay = ["Morning", "Afternoon", "Evening", "Night"];

        this.radialChart = this.parent.append("g").attr("class", ".radialChart");

        this.radialChart.selectAll(".dayWheel").data(this.bucketedData).enter()
            .append("g")
            .attr("class", "dayWheel")
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.bucketedData[i].timeBucket).enter()
                    .append("path")
                    .attr("d", d3.svg.arc()
                                    .innerRadius(function () {
                                        return that.startRadius + that.midRadius * i;
                                    })
                                    .outerRadius(function () {
                                        return that.startRadius + that.midRadius * (i + 1);
                                    })
                                    .startAngle(function (e, j) {
                                        return (j * 2 * Math.PI) / 4 - 3 * Math.PI / 4;

                                    })
                                    .endAngle(function (e, j) {
                                        return ((j + 1) * 2 * Math.PI) / 4 - 3 * Math.PI / 4;

                                    }))
                    .attr("fill", function (d) { return that.radialColorScale(d.avg) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px");
            })
            .append("text")
            .attr("x", -5)
            .attr("y", function (d, i) { return -(that.startRadius + i * that.midRadius + 2) })
            .text(function (d) { return d.day.substr(0,2) })
            .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");
        this.radialChart.attr("transform", "translate(175,300)");

        this.radialChart.selectAll(".dayLabel").data(timesOfDay).enter()
        .append("text")
        .attr("class", "dayLabel")
        .attr("x", function (d, i) { return (that.midRadius * 9 + that.startRadius) * Math.cos(((2 * Math.PI) * i) / 4 - Math.PI) - 20; })
        .attr("y", function (d, i) { return (that.midRadius * 9 + that.startRadius) * Math.sin(((2 * Math.PI) * i) / 4 - Math.PI) })
        .text(function (d) { return d })
        .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");

        this.radialChart2 = this.parent.append("g").attr("class", ".radialChart2");

        this.radialChart2.selectAll(".dayWheel").data(timesOfDay).enter()
            .append("g")
            .attr("class", "dayWheel")
            .each(function (d, i) {
                d3.select(this).selectAll("path").data(that.bucketedData).enter()
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
                    .attr("fill", function (e, j) { return that.radialColorScale(that.bucketedData[j].timeBucket[i].avg) })
                    .attr("stroke", "gray")
                    .attr("stroke-width", "0.3px")
               
            })
         .append("text")
                .attr("x", -5)
                .attr("y", function (d, i) { return -(that.startRadius + i * (that.midRadius * 1.5) + 2) })
                .text(function (d) { return d })
                .style("stroke", "none")
                .style("fill", "black")
                .style("font-size", "12px");;
        this.radialChart2.attr("transform", "translate(500,300)");

        this.radialChart2.selectAll(".dayLabel").data(this.bucketedData).enter()
        .append("text")
        .attr("class", "dayLabel")
        .attr("x", function (d, i) { return (that.midRadius * 1.5 * 5 + that.startRadius) * Math.cos(((2 * Math.PI) * i)/7 - 2*Math.PI/7) - 20})
        .attr("y", function (d, i) { return (that.midRadius * 1.5 * 5 + that.startRadius) * Math.sin(((2 * Math.PI) * i) / 7 - 2*Math.PI / 7) })
        .text(function (d) { return d.day })
        .style("stroke", "none")
            .style("fill", "black")
            .style("font-size", "12px");

    };

    mobility_tooltip.prototype.updateData = function () {

        for (var i = 0; i < 7; i++) {
            this.bucketedData[i].total = 0;
            for (var j = 0; j < this.bucketedData[i].timeBucket.length; j++) {
                this.bucketedData[i].timeBucket[j] = { count: 0, total: 0, avg: 0 };
            }
        }

        for (var i = 0; i < this.data.visits.length; i++) {
            this.bucketData(this.data.visits[i].start, this.data.visits[i].end);
        }

        this.radialColorScale.domain([d3.min(this.bucketedData, function (f) { return d3.min(f.timeBucket, function (tb) { return tb.avg }) }),
            d3.max(this.bucketedData, function (f) { return d3.max(f.timeBucket, function (tb) { return tb.avg }) })
        ]);


    };



    mobility_tooltip.prototype.bucketData = function (start, end) {
        var filteredPeriods = [[], [], [], [], [], [], []];
        var finalFilteredPeriods = [];
        var finalPeriod = 0;

        var noOfDays = (end - start) / (1000 * 60 * 60 * 24);
        var currDay = new Date(start);

        do {
            var periodStart = Math.max(currDay.setHours(0, 0, 0, 0), start);
            var periodEnd = Math.min(currDay.setHours(23, 59, 59, 999), end);

            filteredPeriods[(currDay.getDay() + 6) % 7].push({ from: periodStart, to: periodEnd });
            currDay.setDate(currDay.getDate() + 1);

        } while (periodEnd < end);

        var startFound = false;
        for (var day = 0; day < 7; day++) {
            for (var i = 0; i < filteredPeriods[day].length; i++) {
                currDay = new Date(filteredPeriods[day][i].from);
                var j = 0;
                do {
                    var periodStart = Math.max(currDay.setHours(this.timeOfDayFilter[j].from, 0, 0, 0), start);
                    var periodEnd = Math.min(currDay.setHours(this.timeOfDayFilter[j].to - 1, 59, 59, 999), end);

                    if (!startFound && start > currDay.setHours(this.timeOfDayFilter[j].from, 0, 0, 0) && start < currDay.setHours(this.timeOfDayFilter[j].to, 0, 0, 0))
                        startFound = true;
                    else if (!startFound) {
                        j++;
                        continue;
                    }

                    this.bucketedData[day].timeBucket[(j + 3) % 4].total += (periodEnd - periodStart) / (1000 * 60 * 60);
                    this.bucketedData[day].timeBucket[(j + 3) % 4].count++;
                    this.bucketedData[day].total += (periodEnd - periodStart) / (1000 * 60 * 60);

                    j++;

                } while (j < this.timeOfDayFilter.length && periodEnd < end)
            }
        }

        for (var i = 0; i < this.bucketedData.length; i++) {
            for (var j = 0; j < this.bucketedData[i].timeBucket.length - 1; j++) {
                this.bucketedData[i].timeBucket[j].avg = this.bucketedData[i].timeBucket[j].total / (this.timeOfDayFilter[j + 1].to - this.timeOfDayFilter[j + 1].from);
            }
            this.bucketedData[i].timeBucket[j].avg = this.bucketedData[i].timeBucket[j].total / ((this.timeOfDayFilter[j + 1].to - this.timeOfDayFilter[j + 1].from) + (this.timeOfDayFilter[0].to - this.timeOfDayFilter[0].from));
        }


    };

    
    return mobility_tooltip;

})();