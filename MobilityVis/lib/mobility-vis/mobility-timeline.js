﻿/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-map.js" />

var mobility_timeline = (function () {

    function mobility_timeline(parentContainer, visRef,start, end, currentStart) {
        /// <param name="visRef" type="mobility_map"></param>
        /// <field name="visRef" type="mobility_map"></param>
        var chart = this;
        this.parent = parentContainer;
        this.visRef = visRef;
        this.startTime = start;
        this.endTime = end;
        this.currentStartTime = currentStart;
        this.currentEndTime = 0;
        this.currentTime = 0;
        this.bubble = "0,0 54,0 68,9 54,15 0,15 0,0";
        this.play = "M 0,0 L0,20 L20,10 L0,0";
        this.stop = "M0,0 L0,20 L7,20 L7,0 L0,0 M0,0 M15,20 L22,20 L22,0 L15,0 L15,20";
        this.yScale = null;
        this.brush = null;
        this.tickDuration = 1000;

        this.playing = false;
        this.pause = false;
        this.weekPie = "M 0,0 L-23.75,-50 Q 0,-60 23.75,-50 L0,0";
        this.weekData = [{ label: "SUN", dy: "0.9em", dx: "-0.55em", translate: "-5,-50", clicked: false },
        { label: "MON", dy: "-0.6em", dx: "0.1em", translate: "12,-2", clicked: false },
        { label: "TUE", dy: "0.3em", dx: "0.3em", translate: "15,6", clicked: false },
        { label: "WED", dy: "0.9em", dx: "-0.1em", translate: "5,15", clicked: false },
        { label: "THU", dy: "-0.9em", dx: "0.1em", translate: "-28,55", clicked: false },
        { label: "FRI", dy: "-0.3em", dx: "0.3em", translate: "-48,20", clicked: false },
        { label: "SAT", dy: "0.6em", dx: "0.1em", translate: "-40,-30", clicked: false },
        ];
        

        this.partOfDayPie = "M 0,0 L-40,-40 Q 0,-75 40,-40 L0,0";
        this.partOfDayData = [{ label: "Night", translate: "-30,-30", clicked: false ,index: 0},
        { label: "Morning",  translate: "10,0", clicked: false,index:1 },
        { label: "Afternoon", translate: "-20,30", clicked: false, index:2},
        { label: "Evening",  translate: "-50,0", clicked: false,index:3 }
       
        ];

        this.drawTimeline();
    };

    mobility_timeline.prototype.drawTimeline = function () {
        var that = this;
        this.yScale = d3.time.scale().range([10, 490]).domain([this.startTime, this.endTime]);
        this.brush = d3.svg.brush().y(this.yScale)
            .on("brush", function () { that.updateTimeline() })
            .on("brushend", function () { that.finishUpdate() })
            .extent([this.currentStartTime, this.endTime]);
        this.currentEndTime = this.endTime;
        this.currentStartTime = (this.endTime + this.startTime) / 2;
        
      
        this.parent.append("rect")
       //.attr("rx", 6)
       //.attr("ry", 6)
       .attr("x", 0)
       .attr("y", 0)
       .attr("width", 24)
       .attr("height", 500)
       .attr("class", "timeline box");

        this.parent.append("line").attr("x1", 12).attr("y1", 10).attr("x2", 12).attr("y2", 490)
            .style("stroke", "#000000").style("stroke-width", "1px");
        var gBrush = this.parent.append("g").call(this.brush);
        gBrush.selectAll("rect").attr("x", 6).attr("width", 12).style("fill", "#E80C7A").style("fill-opacity",0.8);
        gBrush.selectAll(".resize").append("path").attr("d", resizePath).attr("transform", "translate(30,0) rotate(90)");

        d3.selectAll(".resize").append("polyline").attr("points", this.bubble).attr("transform","translate(-60,-7)").attr("class","dateLabel");
        d3.selectAll(".resize.n").append("text").attr("class", "dateLabel dateString").attr("id", "startDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[0]))).attr("transform", "translate(-59,5)");
        d3.selectAll(".resize.s").append("text").attr("class", "dateLabel dateString").attr("id", "endDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[1]))).attr("transform", "translate(-59,5)");
        

        function resizePath(d) {
            var s = +(d == "s"),
                x = s ? 1 : -1,
                y = 12;
            return "M" + (.5 * x) + "," + y
                + "A6,6 0 0 " + s + " " + (6.5 * x) + "," + (y + 6)
                + "V" + (2 * y - 6)
                + "A6,6 0 0 " + s + " " + (.5 * x) + "," + (2 * y)
                + "Z"
                + "M" + (2.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
                + "M" + (4.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8);
        }
        var weekButtonsGrp = this.parent.append("g").attr("class", "weekButtons box").attr("transform", "translate(12,-50) scale(0.7)");
        var weekButtons = weekButtonsGrp.selectAll("g").data(this.weekData).enter().append("g").attr("class", "weekButton")
        .on("click", function(d,i) {
            that.visRef.updateDayOfWeekFilter(i);
            d.clicked = !d.clicked;
            d3.select(this).select("path").style("fill", function (d) { if (d.clicked) return "#999999"; else return "#eeeeee"; });
        });

        weekButtons
            .append("path")
            .attr("d", function () {
                return that.weekPie
            })
            .attr("transform", function (d,i) { return " rotate(" + i * 51.4 + ")" });

        weekButtons.each(function(d) {
            d3.select(this).append("text").attr("class","buttonText")
                .attr("x", 0)
                .attr("y", 0)
                .attr("transform", "translate(" + d.translate + ")")
                .style("fill", "rgb(42, 42, 42)")
                .style("font-family", "Courier New")
                .style("font-size", "12px")
                .selectAll("tspan").data(d.label.split("")).enter()
                .append("tspan")
            .text(function (e) { return e; })
            .attr("dy", d.dy )
            .attr((d.label != "SUN") ? "dx" : "x", (d.label != "SUN") ? d.dx : 0);
        });

        var partOfDayButtonsGrp = this.parent.append("g").attr("class", "partOfDayButtons box").attr("transform", "translate(-100,-50) scale(0.7)");
        var partOfDayButtons = partOfDayButtonsGrp.selectAll("g").data(this.partOfDayData).enter().append("g").attr("class", "partOfDayButton")
        .on("click", function (d, i) {
            if (d.index == 0) {
                that.visRef.updateTimeofDayFilter(d.index);
                that.visRef.updateTimeofDayFilter(4);
            }
            else that.visRef.updateTimeofDayFilter(i);
            d.clicked = !d.clicked;
            d3.select(this).select("path").style("fill", function (d) { if (d.clicked) return "#999999"; else return "#eeeeee"; });
        });

        partOfDayButtons
            .append("path")
            .attr("d", function () {
                return that.partOfDayPie
            })
            .attr("transform", function (d, i) { return " rotate(" + i * 90+ ")" });

        partOfDayButtons.append("text").text(function (d) { return d.label; })

                 .attr("class", "partOfDayText")
                 .attr("x", 0)
                 .attr("y", 0)
                 .attr("transform", function (d) { return "translate(" + d.translate + ")" })
                 .style("fill", "rgb(42, 42, 42)")
                 .style("font-family", "Courier New")
                 .style("font-size", "12px");
        ///--

         this.parent.append("path").attr("d", this.play ).attr("transform", "translate(0,515)")
             .attr("class", "playbutton box").on("click", function () {
             if (!that.playing && !that.pause) {
                 that.startPlaying();
                 
             }
             else if (that.playing && !that.pause) {
                 that.pausePlaying();
             }
             else if (that.playing && that.pause) {
                 that.resumePlaying();
                
             }
         }
             );

    };

    mobility_timeline.prototype.updateTimeline = function () {
        var position = this.brush.extent();
        d3.select("#startDate").text(mobility_timeline.formatDate(position[0]));
        d3.select("#endDate").text(mobility_timeline.formatDate(position[1]));

        this.currentStartTime = position[0].getTime();
        this.currentEndTime = position[1].getTime();
        this.playing = false;
        this.pause = false;
        d3.select("#ticker").remove();
        this.visRef.updateTime(this.currentStartTime, this.currentEndTime);
        d3.select(".playbutton").attr("d", this.play);//attr("points", this.play);

        d3.selectAll(".dateLabel").style("visibility", "visible");
    };

    mobility_timeline.prototype.finishUpdate = function () {
        this.visRef.updateTimeEnd();
    };

    mobility_timeline.prototype.startPlaying = function () {
        var that = this;
        var timeDifferent = Math.floor((this.currentEndTime - this.currentStartTime) / (1000 * 60 * 60 * 24));
        var tickerGroup = this.parent.append("g").attr("id", "ticker")
            .attr("transform", "translate(0," + this.yScale(this.currentStartTime) + ")");
        tickerGroup.transition()
            .duration(timeDifferent * this.tickDuration)
            .ease("linear")
            .attr("transform", "translate(0," + this.yScale(this.currentEndTime) + ")")
            .remove();

        tickerGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 24)
        .attr("height", 2)       
        .style("color", "blue");

        tickerGroup.append("polyline").attr("points", this.bubble).attr("transform", "translate(-60,-7)").attr("class", "tickerLabel");
        tickerGroup.append("text").attr("class", "dateString").attr("id", "currDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[0]))).attr("transform", "translate(-59,5)");
        var startDate = new Date(that.currentStartTime).setHours(0, 0, 0, 0);

        that.visRef.updateTime(startDate, startDate + (1000 * 60 * 60 * 24));
        this.playing = true;
        d3.select(".playbutton").attr("d", this.stop);//attr("points", this.stop);
        d3.selectAll(".dateLabel").style("visibility", "hidden");

        
        this.currentTime = this.currentStartTime;
        setTimeout(function () {
            that.timeTick();
            that.currentTime += 1000 * 60 * 60 * 24 ;
        }, that.tickDuration);

    };

    mobility_timeline.prototype.timeTick = function () {
        var that = this;
        if (this.playing && that.currentTime < that.currentEndTime && !this.pause) {
            that.visRef.timeTick();
            d3.select("#currDate").text(mobility_timeline.formatDate(new Date(that.currentTime))).attr("transform", "translate(-59,5)");
            setTimeout(function () {
                that.timeTick();
                that.currentTime += 1000 * 60 * 24 * 60;
            }, that.tickDuration);

        }
        else if (that.currentTime >= that.currentEndTime) {
            // Finish playback
            this.playing = false;
            this.updateTimeline();
            this.finishUpdate();
            //d3.select(".playbutton").attr("d", this.play )//;attr("points", this.play);
            //d3.selectAll(".dateLabel").style("visibility", "visible");
            //d3.select("#ticker").remove();
            //this.visRef.updateTime

        }
    };
    mobility_timeline.prototype.pausePlaying = function () {
        this.pause = true;
        d3.select("#ticker").transition()
        .duration(0);
        d3.select(".playbutton").attr("d", this.play );//.attr("points", this.play);


    };
    mobility_timeline.prototype.resumePlaying = function () {
        this.pause = false;
        var that = this;
        var timeDifferent = Math.floor((this.currentEndTime - this.currentTime) / (1000 * 60 * 24 * 60));
        d3.select("#ticker").transition().duration(timeDifferent * this.tickDuration).ease("linear")
            .attr("transform", "translate(0," + this.yScale(this.currentEndTime) + ")")
        d3.select(".playbutton").attr("d", this.stop); //attr("points", this.stop);

        setTimeout(function () {
            that.timeTick();
            that.currentTime += 1000 * 60 * 24 * 60;
        }, that.tickDuration);
    };


    mobility_timeline.formatDate = function (date) {

        var m_names = new Array("Jan", "Feb", "Mar",
"Apr", "May", "Jun", "Jul", "Aug", "Sep",
"Oct", "Nov", "Dec");
        var curr_date = date.getDate();
        if (curr_date < 10) curr_date = "0" + curr_date;
        var curr_month = date.getMonth();
        var curr_year = date.getFullYear();
        return (curr_date + " " + m_names[curr_month] + " " + (curr_year % 100));
    };
   

    return mobility_timeline;

})();