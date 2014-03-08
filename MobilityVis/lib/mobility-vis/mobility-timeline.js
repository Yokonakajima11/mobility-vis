/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-map.js" />

var mobility_timeline = (function () {

    function mobility_timeline(parentContainer, visRef,start, end) {
        /// <param name="visRef" type="mobility_map"></param>
        /// <field name="visRef" type="mobility_map"></param>
        var chart = this;
        this.parent = parentContainer;
        this.visRef = visRef;
        this.startTime = start;
        this.endTime = end;
        this.bubble = "0,0 54,0 54,5 68,9 54,11 54,15 0,15 0,0";
        this.m_names = new Array("Jan", "Feb", "Mar",
        "Apr", "May", "Jun", "Jul", "Aug", "Sep",
        "Oct", "Nov", "Dec");
        this.drawTimeline();
        

       


    };

    mobility_timeline.prototype.drawTimeline = function () {
        var that = this;
        var yScale = d3.time.scale().range([10, 490]).domain([this.startTime, this.endTime]);
        var brush = d3.svg.brush().y(yScale).on("brush", brushed).on("brushend", brushedEnd).extent([(this.endTime + this.startTime)/2, this.endTime]);
        function formatDate(date) {
            var curr_date = date.getDate();
            if (curr_date < 10) curr_date = "0" + curr_date;
            var curr_month = date.getMonth();
            var curr_year = date.getFullYear();
            return (curr_date + " " + that.m_names[curr_month] + " " + (curr_year%100));
        };

         this.parent.append("rect")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 24)
        .attr("height", 500)
        .attr("class","timeline");
         this.parent.append("line").attr("x1", 12).attr("y1", 10).attr("x2", 12).attr("y2", 490);
         var gBrush = this.parent.append("g").call(brush);
         gBrush.selectAll("rect").attr("x", 6).attr("width", 12).style("fill", "#E80C7A").style("fill-opacity",0.8);
         gBrush.selectAll(".resize").append("path").attr("d", resizePath).attr("transform", "translate(30,0) rotate(90)");

         d3.selectAll(".resize").append("polyline").attr("points", this.bubble).attr("transform","translate(-60,-5)");
        d3.selectAll(".resize.n").append("text").attr("class", "dateString").attr("id", "startDate").text(formatDate(new Date(brush.extent()[0]))).attr("transform" ,"translate(-59,7)");
        d3.selectAll(".resize.s").append("text").attr("class", "dateString").attr("id", "endDate").text(formatDate(new Date(brush.extent()[1]))).attr("transform", "translate(-59,7)");

         function brushed() {
             var position = brush.extent();
             d3.select("#startDate").text(formatDate(position[0]));             
             d3.select("#endDate").text(formatDate(position[1]));

             that.startTime = position[0].getTime();
             that.endTime = position[1].getTime();
             that.visRef.updateTime(that.startTime, that.endTime);
         };

         function brushedEnd() { };

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


    };
   

    return mobility_timeline;

})();