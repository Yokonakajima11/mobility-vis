/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />

var mobility_gui = (function () {

    function mobility_gui(parenContainer, visRef) {

        this.parent = parenContainer;
        this.visRef = visRef;
        this.parentId = visRef.parentId;

        this.colorScale = d3.scale.linear().range([0, 300]).domain([0, 24]).clamp(true);

        this.draw();
    };

    mobility_gui.prototype.draw = function () {

        var scaleGrp = this.parent.append("g")
            .attr("class", "scale")
            .attr("transform", "translate(20," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
        var gradient = scaleGrp.append("linearGradient")
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

        scaleGrp
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 300)
            .attr("height", 15)
            .attr("fill", "url(#gradient)");

        var ticks = scaleGrp.selectAll("line").data([0, 12, 24]).enter();
        ticks.append("line")
            .attr("x1", function (d, i) { return i * 150 })
            .attr("y1", 0)
            .attr("x2", function (d, i) { return i * 150 })
            .attr("y2", 25).style("stroke", "white");
        ticks.append("text").text(function (d) { return d })
            .attr("x", function (d, i) { return (i * 150) - 7 })
            .attr("y", 38)
            .style("fill", "white");

    };

    mobility_gui.prototype.update = function () {

        this.parent.selectAll(".scale")
            .attr("transform", "translate(20," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
    };

    mobility_gui.prototype.update = function () {

        this.parent.selectAll(".scale")
            .attr("transform", "translate(20," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
    };

    mobility_gui.prototype.drawScaleTick = function (value) {

        this.parent.select(".scale").append("rect").attr("x", 0)
            .attr("y", -20)
            .attr("width", 3)
            .attr("height", 35).attr("id","colorScaleTick")
            .style("fill", "white").transition().attr("x", this.colorScale(value));
    };
    mobility_gui.prototype.removeScaleTick = function () {
        this.parent.select("#colorScaleTick").remove();

    };

    
    return mobility_gui;

})();