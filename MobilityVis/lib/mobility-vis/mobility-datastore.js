/// <reference path="../d3.v3/d3.v3.js" />
/// <reference path="mobility-point.js" />
/// 
/// ======================================================================================================
/// File: MOBILITY-DATASTORE.js
/// ======================================================================================================
/// <summary>
/// This class serves as a data store for all the data used by the 
/// mobility visualisations.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================


var mobility_datastore = (function () {

    function mobility_datastore(dataUrl) {
    	/// <summary>
    	/// Constructor for the mobility-datastore object
    	/// </summary>
        /// <param name="dataUrl">URL from where to fetch data as a JSON object</param>
        var storage = this;

        /*----------------------------------------  Data    ------------------------------------------*/
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
        /// <field name="startTime" type="Number">Timestamp of the first data point</field>
        this.startTime = 0;
        /// <field name="endTime" type="Number">Timestamp of the last data point</field>
        this.endTime = 0;

        /*--------------------------------------  Constructor    -------------------------------------*/
        //Fetch the data from the URL
        d3.csv(dataUrl, function (data) {
            storage.data = storage.filterPoints(data);
            storage.startTime = storage.data.time[0].start;
            storage.endTime = storage.data.time[storage.data.time.length - 1].end;

            //Notify the visualization that the data is ready
            var event = new CustomEvent("dataReady", { detail: { startTime: storage.startTime, endTime: storage.endTime }});         
            dispatchEvent(event);
        });

    };

    /*-----------------------------------------  Data methods    --------------------------------------*/
    mobility_datastore.prototype.updatePoints = function (startTime, endTime, append) {
        /// <summary>
        /// Updates the point according to time period
        /// </summary>
        /// <param name="startTime" type="Number">Start of the new time period for which to calculate data</param>
        /// <param name="endTime" type="Number">End of the new time period for which to calculate data</param>
        /// <param name="append" type = "Boolean">Whether the update should append to preexisting data or replace it</param>
        /// <returns type="Array" elementType="mobility_point">Data points to display</returns>

        var countDict = {};
        var displayedPoints = [];
        // Count the number and time of visits in all point for this period in dictionary
        for (var i = 0; i < this.data.time.length; i++) {
            var curDate = new Date(this.data.time[i].start);
            if (this.data.time[i].start > endTime)
                break;
            else if (this.data.time[i].start > startTime) {
                var period = this.data.time[i].end - this.data.time[i].start;
                if (countDict[this.data.time[i].id] == undefined)
                    countDict[this.data.time[i].id] = { time: period, count: 1, visits: [] };
                else {
                    countDict[this.data.time[i].id].time += period;
                    countDict[this.data.time[i].id].count += 1;
                }

                countDict[this.data.time[i].id].visits.push(this.data.time[i]);
            }
        }
        // Move data from dictionary to Array
        for (var i = 0; i < this.data.location.length; i++)
            if (countDict[this.data.location[i].id] == undefined && !append) {
                this.data.location[i].clear();
            }
            else if (!append) {

                this.data.location[i].update(countDict[this.data.location[i].id].count,
                                                countDict[this.data.location[i].id].time,
                                                countDict[this.data.location[i].id].visits);

            }
            else if (countDict[this.data.location[i].id] != undefined && append) {
                this.data.location[i].count += (countDict[this.data.location[i].id].count);
                this.data.location[i].time += (countDict[this.data.location[i].id].time);
                this.data.location[i].makeAverage();
                displayedPoints.push(this.data.location[i]);
            }

        if (!append) {
            // Display only the points that have count > 0
            this.data.location.sort(function (a, b) { return b.time - a.time; });
            var slice = 0
            for (var i = 0; i < this.data.location.length; i++) {
                if (this.data.location[i].count == 0) break;
                this.data.location[i].makeAverage();

                slice = i + 1;
            }
            displayedPoints = this.data.location.slice(0, slice);
        }

        return displayedPoints;

    };

    mobility_datastore.prototype.updateConnections = function (startTime, endTime, threshold) {
        /// <summary>
        /// Update the connections data within the given time period
        /// </summary>
        /// <param name="startTime" type="Number">Start of the new time period for which to calculate data</param>
        /// <param name="endTime" type="Number">End of the new time period for which to calculate data</param>
        /// <param name="threshold" type="Boolean">Whether the connections should be thresholded</param>

        this.data.connections = [];
        //Generate the connection objects
        for (var i = 0; i < this.data.time.length - 1; i++) {
            var found = false;
            var curDate = new Date(this.data.time[i].start);
            var nextDate = new Date(this.data.time[i + 1].start);
            if (this.data.time[i].start > endTime)
                break;
            else if (this.data.time[i].start > startTime && this.data.time[i].id != this.data.time[i + 1].id) {
                for (var j = 0; j < this.data.connections.length; j++) {
                    if (this.data.connections[j].from == this.data.time[i].id && this.data.connections[j].to == this.data.time[i + 1].id) {
                        this.data.connections[j].score += 1;
                        found = true;
                        break;
                    }
                }
                if (!found)
                    this.data.connections.push({ from: this.data.time[i].id, to: this.data.time[i + 1].id, tresholded: false, score: 1, tresholdedScore: 0 });
            }
        }
        //Run thresholding
        if (threshold)
            this.tresholdEdges(0.6);
        else
            for (var i = 0; i < this.data.connections.length ; i++)
                this.data.connections[i].tresholded = true;
    };

    mobility_datastore.prototype.filterPoints = function (data) {
        /// <summary>
        /// Filters and clusters raw data point
        /// </summary>
        /// <param name="data" type="Object">Raw data</param>
        /// <returns type="Object">Filtered data containing unique points, time data and point dictionary</returns>
        var chart = this;
        var filteredData = [];
        var timeData = [];
        var locDict = {};
        var dict = {};

        var distance = function (pointA, pointB) {
            var R = 6371; // km
            var fi1 = pointA.lat * Math.PI / 180;
            var fi2 = pointB.lat * Math.PI / 180;
            var dfi = fi2 - fi1;
            var dl = (pointB.lon - pointA.lon) * Math.PI / 180;

            var a = Math.sin(dfi / 2) * Math.sin(dfi / 2) +
                    Math.cos(fi1) * Math.cos(fi2) *
                    Math.sin(dl / 2) * Math.sin(dl / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            var d = R * c;

            return d;

        };
        //grouping pois with the same ID
        for (var i = 0; i < data.length; i++) {
            if (dict[data[i].id] == undefined)
                dict[data[i].id] = [data[i]];
            else
                dict[data[i].id].push(data[i])
            timeData.push({ id: data[i].id, start: data[i].arrival * 1000, end: data[i].departure * 1000 });
        }
        //counting average of pois location
        for (var id in dict) {
            var point = dict[id];
            var meanLon = 0, meanLat = 0;
            var maxExtent = 0;
            for (var a = 0; a < point.length; a++) {
                for (var b = a; b < point.length; b++) {
                    var dist = distance(point[a], point[b]);
                    if (dist > maxExtent)
                        maxExtent = dist;
                }
                meanLon += +point[a].lon;
                meanLat += +point[a].lat;
            }

            var realMean = d3.mean(point, function (d) { return d.lon });
            var averagePoint = new mobility_point(id, meanLat / point.length, meanLon / point.length);
            locDict[id] = averagePoint;
            filteredData.push(averagePoint);
            averagePoint.getLocationData(0);
        }   

        return { location: filteredData, time: timeData, locDict: locDict };
    };

    mobility_datastore.prototype.bucketData = function (filterFun) {
    	/// <summary>
    	/// Bucket the data and update the data points
    	/// </summary>
        /// <param name="filterFun" type="Object">The function used to filter whether a point is displayed 
        ///     or not</param>
        for (var i = 0; i < this.data.location.length; i++) {
            if (this.data.location[i].count == 0) break;
            this.data.location[i].bucketData();

            if(filterFun)
                this.data.location[i].filtered = filterFun(this.data.location[i]);
        }
    };

    mobility_datastore.prototype.makeGraph = function (root) {
    	/// <summary>
    	/// Generate a tree out of all the data points
    	/// </summary>
        /// <param name="root"  type="mobility_point" optional="true">
        ///     The data point to be the root of the tree. If undefined the first data point is used</param>
    	/// <returns type="d3.layout.tree">The constructed tree</returns>
        var storage = this;
        var allPoints = this.updatePoints(this.startTime, this.endTime, false);
        this.updateConnections(this.startTime, this.endTime, false);
        var rootIndex = 0;

        // Find the index of the data point if it is defined
        if (root)
            for (var i = 0; i < allPoints.length; i++)
                if (allPoints[i].id == root.id) {
                    rootIndex = i;
                    break;
                }        
  
        var graph = { point: allPoints[rootIndex], children: [] };
        var visited = [allPoints[rootIndex].id];
        var toDo = [graph];
        // Build the tree
        // If the two points are directly connected, the latter becomes the child of the former
        // Each point exists in the tree exactly once
        while (toDo.length != 0) {      
            var newToDo = [];
            for(var i = 0; i<toDo.length; i++){
                var ourNbs = neighbours(toDo[i].point.id);

                for (var j = 0; j < ourNbs.length; j++) {
                    if (visited.indexOf(ourNbs[j].id) == -1) {                        
                        var newChild = { point: ourNbs[j], children: [] };
                        toDo[i].children.push(newChild);
                        newToDo.push(newChild);
                        visited.push(ourNbs[j].id);
                    }
                }
            }
            toDo = newToDo;            
        };

        // Function determining whether two locations are connected
        function neighbours(node) {
            var result = [];
            for (var i = 0; i < storage.data.connections.length; i++) {
                if (storage.data.connections[i].from == node)
                    result.push(storage.data.locDict[storage.data.connections[i].to]);
                else if (storage.data.connections[i].to == node)
                    result.push(storage.data.locDict[storage.data.connections[i].from]);
            };
            return result;
        };

        return graph;
    };

    /*----------------------------------------  Utility methods    ------------------------------------*/
    mobility_datastore.prototype.tresholdEdges = function (alpha) {
        /// <summary>
        /// Thresholds the edges of connection network using algorithms from Serrano et al. 
        /// "Extracting the multiscale backbone of complex weighted network"
        /// </summary>
        /// <param name="alpha"  type="Number">The thresholding parameter</param>
        var nodes = this.data.location;
        var edges = this.data.connections;

        var __degree = function (edges, node, weighted) {
            var result = 0;
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].from == node || edges[i].to == node)
                    result += weighted ? edges[i].score : 1;
            };
            return result;
        };
        var __nbs = function (edges, node) {
            var result = [];
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].from == node)
                    result.push({ nb: edges[i].to, score: edges[i].score });
            };
            return result;
        };
        // integral of (1-x)^(k_n-2)
        var integral = function (x) {
            return -(Math.pow(1 - x, k_n - 1) / k_n - 1);
        };

        var tresholdedEdges = [];
        for (var i = 0; i < nodes.length; i++) {
            var k_n = __degree(edges, nodes[i].id, false);
            if (k_n > 1) {
                var sum_w = __degree(edges, nodes[i].id, true);
                var nbs = __nbs(edges, nodes[i].id);

                for (var j = 0; j < nbs.length; j++) {
                    var edgeW = nbs[j].score;
                    var p_ij = edgeW / sum_w;
                    var alpha_ij = 1 - (k_n - 1) * (integral(p_ij) - integral(0));
                    if (alpha_ij < alpha) {
                        var found = false;
                        for (var e = 0; e < tresholdedEdges.length; e++) {
                            if (tresholdedEdges[e].from == nbs[j].nb && tresholdedEdges[e].to == nodes[i].id)
                                found = true;
                        }
                        if (!found)
                            tresholdedEdges.push({
                                from: nodes[i].id,
                                to: nbs[j].nb,
                                score: nbs[j].score
                            });

                    }
                }
            }
        }
        for (var i = 0; i < tresholdedEdges.length; i++) {
            for (var j = 0; j < edges.length; j++) {
                if (tresholdedEdges[i].from == edges[j].from && tresholdedEdges[i].to == edges[j].to) {
                    edges[j].tresholded = true;
                    edges[j].score = tresholdedEdges[i].score;
                    break;
                }

            }
        }
    };

    mobility_datastore.prototype.resetPoints = function () {
    	/// <summary>
    	/// Reset the time period to include all of the points in the data store
    	/// </summary>
        this.updatePoints(this.startTime, this.endTime, false);
    };

    return mobility_datastore;
})();