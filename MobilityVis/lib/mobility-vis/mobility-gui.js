/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-tooltip.js" />

var mobility_gui = (function () {

    function mobility_gui(parenContainer, visRef) {
        /// <param name="visRef" type="mobility_map"></param>
        /// <field name="visRef" type="mobility_map"></param>

        this.parent = parenContainer;
        this.visRef = visRef;
        this.parentId = visRef.parentId;
        this.currentTooltip = null;


        this.colorScale = d3.scale.linear().range([0, 300]).domain([0, 24]).clamp(true);

        this.drawCopyright();
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
            .attr("y2", 25).style("stroke", "grey");
        ticks.append("text").text(function (d) { return d })
            .attr("x", function (d, i) { return (i * 150) - 7 })
            .attr("y", 38)
            .style("fill", "grey");
    };


    mobility_gui.prototype.update = function () {

        this.parent.selectAll(".scale")
            .attr("transform", "translate(20," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");
        this.parent.selectAll(".copyrightBox")
            .attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 300) + "," + (document.getElementById(this.parentId).offsetHeight - 50) + ")");

    };

    mobility_gui.prototype.drawScaleTick = function (value) {

        this.parent.select(".scale").append("rect").attr("x", 0)
            .attr("y", -20)
            .attr("width", 3)
            .attr("height", 35).attr("id","colorScaleTick")
            .style("fill", "grey").transition().attr("x", this.colorScale(value));
    };
    mobility_gui.prototype.removeScaleTick = function () {
        this.parent.selectAll("#colorScaleTick").remove();

    };

    mobility_gui.prototype.showDetailFrame = function (data) {
        var grp = this.parent.append("g")
            .attr("class", "detailFrame")
            .attr("transform", "translate(-500, 100)");

      
        grp.transition()
        .attr("transform", "translate(10, 100)");

        this.currentTooltip = new mobility_tooltip(grp, data);
    };

    mobility_gui.prototype.hideDetailFrame = function () {
        var that = this;
        this.parent.selectAll(".detailFrame")
            .transition()
            .attr("transform", "translate(-500, 100)").remove();

        
        this.currentTooltip = null;
        
    };

    mobility_gui.prototype.drawCopyright = function () {

        var copGrp = this.parent.append("g").attr("class", "copyrightBox");

        copGrp.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", 15)
            .attr("width", 130)
            .attr("class", "box");

        copGrp.append("a")
        .attr("xlink:href", "http://www.openstreetmap.org/copyright")
        .append("text")
        .text("© OpenStreetMap contributors")
        .attr("x", 5)
        .attr("y", 10)
        .style("font-size", "9px");

        copGrp.attr("transform", "translate(" + (document.getElementById(this.parentId).offsetWidth - 140) + "," + (document.getElementById(this.parentId).offsetHeight - 25) + ")");


    };

    
    return mobility_gui;

})();