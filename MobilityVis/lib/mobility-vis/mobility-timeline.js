/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-map.js" />
/// 
/// ======================================================================================================
/// File: MOBILITY-TIMELINE.js
/// ======================================================================================================
/// <summary>
/// The class for the timeline on the main map visualization.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================

var mobility_timeline = (function () {

    function mobility_timeline(parentContainer, visRef,start, end, currentStart) {
    	/// <summary>
    	/// The constructor for the mobility-timeline object.
    	/// </summary>
    	/// <param name="parentContainer" type="d3.selection">The selection containing the SVG parent container.</param>
    	/// <param name="visRef" type="mobility_map">The reference to the main map visualization.</param>
    	/// <param name="start" type="Number">The beginning of the timeline</param>
        /// <param name="end" type="Number">The end of the timeline</param>
        /// <param name="currentStart" type="Number">The beginning of the visualized time period</param>
        var chart = this;

        /// <field name="parent" type="d3.selection">The selection containing the parent SVG container</field>
        this.parent = parentContainer.append("g").attr("id", "timelineContainer");
        /// <field name="visRef" type="mobility_map">The reference to the main map visualization</field>
        this.visRef = visRef;
        /// <field name="startTime" type="Number">The timestamp of the beginning of the timeline</field>
        this.startTime = start;
        /// <field name="endTime" type="Number">The timestamp of the end of the timeline</field>
        this.endTime = end;
        /// <field name="currentStartTime" type="Number">The timestamp of the beginning of the selected period</field>
        this.currentStartTime = currentStart;
        /// <field name="currentEndTime" type="Number">The timestamp of the end of the selected period</field>
        this.currentEndTime = end;
        /// <field name="currentTime" type="Number">The timestamp of the ticker on the timeline</field>
        this.currentTime = 0;
        /// <field name="bubble" type="String">The bubble shape for the timeline</field>
        this.bubble = "0,-7.5 55,-7.5 70,0 55,7.5 0,7.5 0,0 0,-7.5";
        /// <field name="playShape" type="String">The play button path shape</field>
        this.playShape = "M 0,0 L0,15 L15,7.5 L0,0";
        /// <field name="fasterShape" type="String">The faster button path shape</field>
        this.fasterShape = "M 0,0 L0,15 L7.5,7.5 L0,0 M7.5,0 L7.5,15 L15,7.5 L7.5,0";
        /// <field name="slowerShape" type="String">The slower button path shape</field>
        this.slowerShape = "M0,0 L0,15 L3,15 L3,0 L0,0 M5,0 L5,15 L15,7.5 L5,0";
        /// <field name="pauseShape" type="String">The pause button path shape</field>
        this.pauseShape = "M0,0 L0,15 L6.5,15 L6.5,0 L0,0 M0,0 M8.5,15 L15,15 L15,0 L8.5,0 L8.5,15";
        /// <field name="stopShape" type="String">The stop button path shape</field>
        this.stopShape = "M1,1 L1,14 L14,14 L14,1 L1,1";
        /// <field name="yScale" type="d3.scale">The time scale for the timeline</field>
        this.yScale = null;
        /// <field name="brush" type="d3.svg.brush">The timeline selection brush</field>
        this.brush = null;
        /// <field name="tickDuration" type="Number">The duration of a single day animation</field>
        this.tickDuration = 1000;

        /// <field name="playing" type="Boolean">The flag indicating whether the animation is playing</field>
        this.playing = false;
        /// <field name="pause" type="Boolean">The flag indicating whether the animation is paused</field>
        this.pause = false;
        /// <field name="updatingTime" type="Boolean">The flag indicating whether the selection is being dragged (but not let go yet)</field>
        this.updatingTime = false;

        this.drawTimeline();
    };

    /*----------------------------------------  Drawing methods    ------------------------------------*/
    mobility_timeline.prototype.drawTimeline = function () {
    	/// <summary>
    	/// Draw the timeline itself.
    	/// </summary>
        var that = this;
        this.yScale = d3.time.scale().range([10, 490]).domain([this.startTime, this.endTime]);
        this.brush = d3.svg.brush().y(this.yScale)
            .on("brush", function () { that.updateTimeline() })
            .on("brushend", function () { that.finishUpdate() })
            .extent([this.currentStartTime, this.currentEndTime]);

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

        // Draw the play button
        var playBtnGrp = this.parent.append("g")
            .attr("class", "button")
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
    	/// <summary>
    	/// Update the timeline, when the selection is changed.
    	/// </summary>
        this.updatingTime = true;
        var position = this.brush.extent();
        d3.select("#startDate").text(mobility_timeline.formatDate(position[0]));
        d3.select("#endDate").text(mobility_timeline.formatDate(position[1]));

        this.currentStartTime = position[0].getTime();
        this.currentEndTime = position[1].getTime();
        this.visRef.updateTime(this.currentStartTime, this.currentEndTime);
        if (this.playing) {
            if ($.mlog)
                $.mlog.logEvent("timelinePlaybackStopped");
            this.stopPlaying();
        }
    };

    mobility_timeline.prototype.finishUpdate = function () {
    	/// <summary>
    	/// Finish updating the timeline, when the user lets go of the brush.
    	/// </summary>
        if (this.updatingTime) {
            this.visRef.updateTimeEnd();
            this.updatingTime = false;
        }

        if ($.mlog)
            $.mlog.logEvent("timelineEvent");
    };

    /*---------------------------------------  Animation methods    -----------------------------------*/
    mobility_timeline.prototype.startPlaying = function () {
    	/// <summary>
    	/// Begin the daily animation.
    	/// </summary>
        var that = this;
        if ($.mlog)
            $.mlog.logEvent("timelinePlayback");

        this.tickDuration = this.visRef.tickDuration = 1000;
        var startDate = new Date(that.currentStartTime).setHours(0, 0, 0, 0);
        that.visRef.startAnimating();
        that.visRef.updateTime(startDate, startDate + (1000 * 60 * 60 * 24));
        this.currentTime = startDate;
        this.playing = true;
        setTimeout(function () {
            that.currentTime += 1000 * 60 * 60 * 24;
            that.timeTick();
        }, that.tickDuration);

        // Create the ticker
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
       
        // Change the play button to pause button and create the extra buttons
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
                            if ($.mlog)
                                $.mlog.logEvent("timelinePlaybackStopped");
                            that.stopPlaying();
                            that.visRef.updateTimeEnd();
                        }
                    },
                    {
                        id: "fastBtn",
                        shape: that.fasterShape,
                        clickFun: function (theButton) {
                            if ($.mlog)
                                $.mlog.logEvent("timelinePlaybackEvent");
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
                            if ($.mlog)
                                $.mlog.logEvent("timelinePlaybackEvent");
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
                    .attr("class", "extendedTimeline button")
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
    	/// <summary>
    	/// Pause the daily animation.
        /// </summary>
        if ($.mlog)
            $.mlog.logEvent("timelinePlaybackStopped");

        this.pause = true;
        d3.select("#playButton").attr("d", this.playShape);
    };

    mobility_timeline.prototype.resumePlaying = function () {
    	/// <summary>
    	/// Resume the paused daily animation.
    	/// </summary>
        this.pause = false;
        if ($.mlog)
            $.mlog.logEvent("timelinePlayback");

        var that = this;
               d3.select("#playButton").attr("d", this.pauseShape);

        setTimeout(function () {
            that.timeTick();
            that.currentTime += 1000 * 60 * 24 * 60;
        }, that.tickDuration);
    };

    mobility_timeline.prototype.stopPlaying = function () {
    	/// <summary>
    	/// Stop the daily animation completely.
        /// </summary>
        this.playing = false;
        this.pause = false;
        d3.select("#ticker").remove();
        this.visRef.stopAnimating();
        this.visRef.updateTime(this.currentStartTime, this.currentEndTime);
        
        d3.select("#playButton").attr("d", this.playShape);
        this.parent.select("#timelineBg")
            .transition()
            .attr("height", 530);
        this.parent.selectAll(".extendedTimeline").remove();
        d3.selectAll(".dateLabel").style("visibility", "visible");
    };

    mobility_timeline.prototype.timeTick = function () {
    	/// <summary>
    	/// A single daily animation tick - advance by one day.
    	/// </summary>
        var that = this;
        if (this.playing && that.currentTime < that.currentEndTime && !this.pause) {
            that.visRef.timeTick();
            d3.select("#currDate").text(mobility_timeline.formatDate(new Date(that.currentTime))).attr("transform", "translate(-59,5)");

            d3.select("#ticker").transition()
           .attr("transform", "translate(0," + this.yScale(that.currentTime) + ")");

            // Next tick after tickDuration
            setTimeout(function () {
                that.currentTime += 1000 * 60 * 24 * 60;
                that.timeTick();
            }, that.tickDuration);

        }
        else if (that.currentTime >= that.currentEndTime) {
            this.stopPlaying();            
            this.visRef.updateTimeEnd();
        }
    };

    /*----------------------------------------  Utility methods    ------------------------------------*/
    mobility_timeline.prototype.reset = function () {
    	/// <summary>
    	/// Reset the timeline (when closing the main map visualization)
    	/// </summary>

        this.currentStartTime = this.startTime;
        this.currentEndTime = this.endTime;
        this.parent.selectAll("*").remove();
        //d3.selectAll("#timelineContainer").remove();
        //this.parent = parentContainer.append("g").attr("id", "timelineContainer");
        this.drawTimeline();
    };

    mobility_timeline.formatDate = function (date) {
    	/// <summary>
    	/// Format the Date object into a string for the timeline.
    	/// </summary>
    	/// <param name="date" type="Date">The date to format</param>
    	/// <returns type="String">The formatted string</returns>

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