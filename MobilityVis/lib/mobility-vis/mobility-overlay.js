/// <reference path="../polymaps/polymaps.js" />
/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="../clusterfck/clusterfck-0.1.js" />
/// <reference path="../jquery/jquery.min.js" />
/// <reference path="mobility-point.js" />
/// <reference path="mobility-gui.js" />
/// <reference path="mobility-datastore.js" />

var mobility_overlay = (function () {

    function mobility_overlay(divId, dataStore) {
        var chart = this;

        // <field name="vis" type="String">Parent container ID</field>
        this.parentId = divId;
        /// <field name="vis" type="d3.selection()">Main SVG </field>
        this.vis = d3.select("#" + divId).append("svg:svg");
        /// <field name="visLayer" type="d3.selection()">Visualisation layer</field>
        this.visLayer = null;

        /// <field name="data" type="Object">Object containing all data </field>
        this.data = {
            /// <field type="Array" elementType="mobility_point">List of all unique locations </field>
            location: [],
            /// <field type="Array">List of all visits by time </field>
            time: [],
            /// <field type="Object">Distionary matching ids to map points </field>
            locDict: {},
            /// <field type="Array">List of all unique connections </field>
            connections: []              
        };

        /// <field name="dataStore" type="mobility_datastore">Reference to data storage</param>
        this.dataStore = dataStore;





        this.vis.append("rect")
            .attr({
                x: 0,
                y: 0,
                width: document.getElementById(this.parentId).offsetWidth,
                height: document.getElementById(this.parentId).offsetHeight,
                id: "background",
                "class": "tile"

            })

        this.visLayer = this.vis.append("g").attr("class", "vislayer");


        addEventListener("dataReady", function (e) {
            //Data has been loaded - initialize


            // Establishing initial time
            chart.data = dataStore.data; //chart.filterPoints(data);
            
            chart.dataStore.updatePoints(e.detail.startTime, e.detail.endTime, false);
            chart.dataStore.updateConnections(e.detail.startTime, e.detail.endTime, false);

            chart.drawAll();
        });


    };

    /*----------------------------------------------------------------------  Data methods    ---------------------------------------------------------------------*/

    mobility_overlay.prototype.drawAll = function () {

        this.drawTree();

       
    };

    mobility_overlay.prototype.drawTree = function () {




    };

    mobility_overlay.prototype.redraw = function () {
        d3.select("#background")
            .attr({
                width: document.getElementById(this.parentId).offsetWidth,
                height: document.getElementById(this.parentId).offsetHeight
            });


    };


    return mobility_overlay;

})();