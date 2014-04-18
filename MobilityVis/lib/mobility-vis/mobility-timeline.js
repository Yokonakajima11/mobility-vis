/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-map.js" />

var mobility_timeline = (function () {

    function mobility_timeline(parentContainer, visRef,start, end, currentStart) {
        /// <param name="visRef" type="mobility_map"></param>
        
        var chart = this;
        this.parent = parentContainer;
        /// <field name="visRef" type="mobility_map"></param>
        this.visRef = visRef;
        this.startTime = start;
        this.endTime = end;
        this.currentStartTime = currentStart;
        this.currentEndTime = 0;
        this.currentTime = 0;
        this.bubble = "0,-7.5 55,-7.5 70,0 55,7.5 0,7.5 0,0";
        this.playShape = "M 0,0 L0,15 L15,7.5 L0,0";
        this.fasterShape = "M 0,0 L0,15 L7.5,7.5 L0,0 M7.5,0 L7.5,15 L15,7.5 L7.5,0";
        this.slowerShape = "M0,0 L0,15 L3,15 L3,0 L0,0 M5,0 L5,15 L15,7.5 L5,0";
        this.pauseShape = "M0,0 L0,15 L6.5,15 L6.5,0 L0,0 M0,0 M8.5,15 L15,15 L15,0 L8.5,0 L8.5,15";
        this.stopShape = "M1,1 L1,14 L14,14 L14,1 L1,1";
        this.yScale = null;
        this.brush = null;
        this.tickDuration = 1000;

        this.playing = false;
        this.pause = false;
       

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
           .attr("x", 0)
           .attr("y", 0)
           .attr("width", 30)
           .attr("height", 530)
           .attr("id", "timelineBg")
           .attr("class", "timeline tile");

        this.parent.append("line").attr("x1", 15).attr("y1", 10).attr("x2", 15).attr("y2", 490)
            .style("stroke", "#eeeeee").style("stroke-width", "1px");
        var gBrush = this.parent.append("g").call(this.brush);
        gBrush.selectAll("rect").attr("x", 10).attr("width", 10).style("fill", "#E80C7A").style("fill-opacity", 0.8);

        gBrush.selectAll(".resize")
            .append("rect")
            .attr("x", 10)
            .attr("y", -2.5)
            .attr("width", 10)
            .attr("height", 5);

        d3.selectAll(".resize").append("polyline").attr("points", this.bubble).attr("transform", "translate(-61,0)").attr("class", "dateLabel");
        d3.selectAll(".resize.n").append("text").attr("class", "dateLabel dateString").attr("id", "startDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[0]))).attr("transform", "translate(-59,5)");
        d3.selectAll(".resize.s").append("text").attr("class", "dateLabel dateString").attr("id", "endDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[1]))).attr("transform", "translate(-59,5)");

        var playBtnGrp = this.parent.append("g")
            .attr("transform", "translate(7.5,505)")
            .on("click", function () {
                if (!that.playing && !that.pause) {
                    that.startPlaying();
                }
                else if (that.playing && !that.pause) {
                    that.pausePlaying();
                }
                else if (that.playing && that.pause) {
                    that.resumePlaying();

                }
            })
            .on("mouseover", function () {
                d3.select(this).select("path").style("fill", "#FFFFFF");
            })
            .on("mouseout", function () {
                d3.select(this).select("path").style("fill", null);
            });

        playBtnGrp.append("rect")
            .attr("x", -2.5)
            .attr("y", -2.5)
            .attr("width", 20)
            .attr("height", 20)
            .style("opacity", 0);

        playBtnGrp.append("path").attr("d", this.playShape)
            .attr("id", "playButton")
            .attr("class", "timelineButton");
    };

    mobility_timeline.prototype.updateTimeline = function () {
        var position = this.brush.extent();
        d3.select("#startDate").text(mobility_timeline.formatDate(position[0]));
        d3.select("#endDate").text(mobility_timeline.formatDate(position[1]));

        this.currentStartTime = position[0].getTime();
        this.currentEndTime = position[1].getTime();
        this.stopPlaying();
    };

    mobility_timeline.prototype.finishUpdate = function () {
        this.visRef.updateTimeEnd();
    };

    mobility_timeline.prototype.startPlaying = function () {
        var that = this;
        this.tickDuration = this.visRef.tickDuration = 1000;
        var startDate = new Date(that.currentStartTime).setHours(0, 0, 0, 0);

        that.visRef.updateTime(startDate, startDate + (1000 * 60 * 60 * 24));
        this.currentTime = startDate;
        this.playing = true;
        setTimeout(function () {
            that.currentTime += 1000 * 60 * 60 * 24;
            that.timeTick();
        }, that.tickDuration);


        var tickerGroup = this.parent.append("g").attr("id", "ticker")
            .attr("transform", "translate(0," + this.yScale(this.currentStartTime) + ")");
        tickerGroup.append("polyline").attr("points", this.bubble).attr("transform", "translate(-61,0)").attr("class", "tickerLabel");
        tickerGroup.append("text").attr("class", "dateString").attr("id", "currDate").text(mobility_timeline.formatDate(new Date(this.brush.extent()[0]))).attr("transform", "translate(-59,5)");

       

        tickerGroup.append("rect")
        .attr("x", 10)
        .attr("y", -1)
        .attr("width", 10)
        .attr("height", 2)
        .style("fill", "white");
       
        d3.select("#playButton").attr("d", this.pauseShape);
        d3.selectAll(".dateLabel").style("visibility", "hidden");
        this.parent.select("#timelineBg")
            .transition()
            .attr("height", 620)
            .each("end", function () {
                var playbackButtons = [
                    {
                        id: "stopBtn",
                        shape: that.stopShape,
                        clickFun: function (theButton) {
                            that.stopPlaying();
                            that.finishUpdate();
                        }
                    },
                    {
                        id: "fastBtn",
                        shape: that.fasterShape,
                        clickFun: function (theButton) {
                            if (that.tickDuration > 200) {
                                that.tickDuration -= 200;
                                that.visRef.tickDuration -= 200;
                            }
                            if (that.tickDuration < 400)
                                d3.select(theButton).style("visibility", "hidden");
                            d3.select("#slowBtn").style("visibility", "visible");
                        }
                    },
                    {
                        id: "slowBtn",
                        shape: that.slowerShape,
                        clickFun: function (theButton) {
                            if (that.tickDuration < 5000) {
                                that.tickDuration += 200;
                                that.visRef.tickDuration += 200;
                            }
                            if (that.tickDuration > 4800)
                                d3.select(theButton).style("visibility", "hidden");
                            d3.select("#fastBtn").style("visibility", "visible");
                        }
                    }
                ];

                var exGrps = that.parent.selectAll(".extendedTimeline").data(playbackButtons).enter()
                    .append("g")
                    .attr("transform", function (d, i) { return "translate(7.5," + (535 + 30 * i) + ")"; })
                    .attr("class", "extendedTimeline")
                    .attr("id", function (d) { return d.id; })
                   .on("click", function (d) {
                       d.clickFun(this);
                   })
                   .on("mouseover", function () {
                       d3.select(this).select("path").style("fill", "#FFFFFF");
                   })
                   .on("mouseout", function () {
                       d3.select(this).select("path").style("fill", null);
                   })

                exGrps.append("rect")
                    .attr("x", -2.5)
                    .attr("y", -2.5)
                    .attr("width", 20)
                    .attr("height", 20)
                    .style("opacity", 0);

                exGrps.append("path")
                    .attr("d", function (d) { return d.shape; })
                    .attr("class", "timelineButton");
            });
       
    };

    mobility_timeline.prototype.pausePlaying = function () {
        this.pause = true;
        d3.select("#playButton").attr("d", this.playShape);//.attr("points", this.play);


    };
    mobility_timeline.prototype.resumePlaying = function () {
        this.pause = false;
        var that = this;
               d3.select("#playButton").attr("d", this.pauseShape); //attr("points", this.pause);

        setTimeout(function () {
            that.timeTick();
            that.currentTime += 1000 * 60 * 24 * 60;
        }, that.tickDuration);
    };

    mobility_timeline.prototype.stopPlaying = function () {
        this.playing = false;
        this.pause = false;
        d3.select("#ticker").remove();
        this.visRef.updateTime(this.currentStartTime, this.currentEndTime);
        d3.select("#playButton").attr("d", this.playShape);//attr("points", this.play);
        this.parent.select("#timelineBg")
            .transition()
            .attr("height", 530);
        this.parent.selectAll(".extendedTimeline").remove();
        d3.selectAll(".dateLabel").style("visibility", "visible");
    };

    mobility_timeline.prototype.timeTick = function () {
        var that = this;
        if (this.playing && that.currentTime < that.currentEndTime && !this.pause) {
            that.visRef.timeTick();
            d3.select("#currDate").text(mobility_timeline.formatDate(new Date(that.currentTime))).attr("transform", "translate(-59,5)");

            d3.select("#ticker").transition()
           .attr("transform", "translate(0," + this.yScale(that.currentTime) + ")");

            setTimeout(function () {
                that.currentTime += 1000 * 60 * 24 * 60;
                that.timeTick();
            }, that.tickDuration);

        }
        else if (that.currentTime >= that.currentEndTime) {
            this.stopPlaying();
            this.finishUpdate();
        }
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