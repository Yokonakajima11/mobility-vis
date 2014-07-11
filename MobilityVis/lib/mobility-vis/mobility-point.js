/// ======================================================================================================
/// File: MOBILITY-POINT.js
/// ======================================================================================================
/// <summary>
/// This class represents a single location data point.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================

var mobility_point = (function () {

    function mobility_point(id, lat, lon) {
        /// <summary>
        /// A single data point entity
        /// </summary>
        /// <param name="id">Id of the point</param>
        /// <param name="lat">Latitude of the point</param>
        /// <param name="lon">longitude of the point</param>

        /// <field name="id" type="Number">Id of the point</field>
        this.id = id;
        /// <field name="lat" type="Number">Latitude of the location</field>
        this.lat = lat;
        /// <field name="lon" type="Number">Longitude of the location</field>
        this.lon = lon;
        /// <field name="count" type="Number">Count of visits in the location</field>
        this.count = 0;
        /// <field name="time" type="Number">Total time spent at the location</field>
        this.time = 0;
        /// <field name="avgTime" type="Number">Average time spent at the location</field>
        this.avgTime = 0;
        /// <field name="visits" type="Array">List of visits at the location</field>
        this.visits = [];
        /// <field name="buckets" type="Array">Bucketed visits data</field>
        this.buckets = [];        
        /// <field name="hourData" type="Array">Visits split by each hour</field>
        this.hourData = [];
        /// <field name="dayData" type="Array">Visits split by each day</field>
        this.dayData = [];
        /// <field name="filtered" type="Boolean">If the point is let through the filter</field>
        this.filtered = true;
        /// <field name="locationName" type="String">String with the looked-up location name</field>
        this.locationName = "Unknown location";
        /// <field name="inTop" type="Boolean">Whether the point is amongst top N points (N decided in the datastore)</field>
        this.inTop = false;

        /// <field name="venue" type="Object">The venue object as read from FourSquare</field>
        this.venue = null;
    };

    mobility_point.prototype.clear = function () {
        /// <summary>
        /// Clear visits data for the location
        /// </summary>
        this.count = 0;
        this.time = 0;
        this.avgTime = 0;
        this.visits = [];
        this.buckets = [];
        this.hourData = [];
        this.dayData = [];
    };

    mobility_point.prototype.update = function (count, time, visits) {
        /// <summary>
        /// Update visits data for the location
        /// </summary>
        /// <param name="count">Count of visits in the location</param>
        /// <param name="time">Total time spent at the location</param>
        /// <param name="visits">List of visits at the location</param>
        this.count = count;
        this.time = time;
        this.visits = visits;
        this.hourData = [];
        this.dayData = [];
    };

    mobility_point.prototype.makeAverage = function () {
        /// <summary>
        /// Calculate average time for the point
        /// </summary>
        if (this.count != 0)
            this.avgTime = this.time / (this.count * 1000 * 60 * 60);
    };
    
    mobility_point.prototype.createBuckets = function () {
        /// <summary>
        /// Create new empty buckets for the visit data
        /// </summary>
        var that = this;
        var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        this.buckets = [];

        this.hourData = [];
        this.dayData = [];
        days.forEach(function (d) {
            var ind = that.buckets.push({ day: d, total: 0, timeBucket: [] });
            for (var i = 0; i < 24; i++)
                that.buckets[ind - 1].timeBucket.push({ count: 0, total: 0 });
        });
    };

    mobility_point.prototype.bucketData = function () {
        /// <summary>
        /// Calculate the visits buckets for the location
        /// </summary>
        this.createBuckets();

        for (var l = 0; l < this.visits.length; l++) {
            var filteredPeriods = [[], [], [], [], [], [], []];

            var visit = this.visits[l];
            var currDay = new Date(visit.start);

            //Divide the visits into the day-of-week buckets
            //If visit spans multiple days it will be split
            do {
                var periodStart = Math.max(currDay.setHours(0, 0, 0, 0), visit.start);
                var periodEnd = Math.min(currDay.setHours(23, 59, 59, 999), visit.end);

                filteredPeriods[(currDay.getDay() + 6) % 7].push({ from: periodStart, to: periodEnd });
                currDay.setDate(currDay.getDate() + 1);

            } while (periodEnd < visit.end);

            var startFound = false;
            for (var day = 0; day < 7; day++) {
                //For each of the days of the week
                for (var i = 0; i < filteredPeriods[day].length; i++) {
                    //For each of the visits per given day
                    currDay = new Date(filteredPeriods[day][i].from);
                    var j = currDay.getHours();
                    //Bucket data into hourly buckets, per given day
                    do {
                        //If visit spans multiple hours it will be split
                        var periodStart = Math.max(currDay.setHours(j, 0, 0, 0), visit.start);
                        var periodEnd = Math.min(currDay.setHours(j, 59, 59, 999), visit.end);

                        this.buckets[day].timeBucket[j].total += (periodEnd - periodStart) / (1000 * 60 * 60);
                        this.buckets[day].timeBucket[j].count++;
                        this.buckets[day].total += (periodEnd - periodStart) / (1000 * 60 * 60);
                        this.hourData.push({
                            timestamp: periodStart,
                            length: (periodEnd - periodStart) / (1000 * 60 * 60)
                        });

                        j++;

                    } while (j < 24 && periodEnd < visit.end)
                }
            }            
        }

        this.hourData.sort(function (a, b) { return a.timestamp - b.timestamp; });
        var lastIndex = 0;
        var aDay = new Date(this.hourData[0].timestamp);
        this.dayData.push({
            timestamp: aDay.setHours(0, 0, 0, 0),
            date: aDay,
            length: this.hourData[0].length
        });

        for (var i = 01; i < this.hourData.length; i++) {
            var newDay = new Date(this.hourData[i].timestamp);

            if (aDay.getDate() == newDay.getDate() &&
                aDay.getMonth() == newDay.getMonth() &&
                aDay.getYear() == newDay.getYear()) {

                this.dayData[lastIndex].length += this.hourData[i].length;
            }
            else {
                newDay.setHours(0, 0, 0, 0);
                this.dayData.push({
                    timestamp: +newDay,
                    date: newDay,
                    length: this.hourData[i].length
                });
                lastIndex++;
                aDay = new Date(this.hourData[i].timestamp);
            }
        }

        this.dayData.sort(function (a, b) { return a.timestamp - b.timestamp; });
    };

    mobility_point.prototype.sumBuckets = function (day, start, end) {
        /// <summary>
        /// Sum total time spent in the location on the given day of week between specified
        /// hours.
        /// </summary>
        /// <param name="day">The day of the week to look for</param>
        /// <param name="start">Starting hour</param>
        /// <param name="end">Ending hour</param>
        /// <returns type="Number">The total time spent at the location within the constraints</returns>
        var sum = 0;

        for (var i = start; i < end; i++)
            sum += this.buckets[day].timeBucket[i].total;

        return sum / (end - start - 1);
    };

    mobility_point.prototype.sumBucketsNoCorrection = function (day, start, end) {
        /// <summary>
        /// Sum total time spent in the location on the given day of week between specified
        /// hours. No correcting for the length of the bucket.
        /// </summary>
        /// <param name="day">The day of the week to look for</param>
        /// <param name="start">Starting hour</param>
        /// <param name="end">Ending hour</param>
        /// <returns type="Number">The total time spent at the location within the constraints</returns>
        var sum = 0;

        for (var i = start; i < end; i++)
            sum += this.buckets[day].timeBucket[i].total;

        return sum;
    };

    mobility_point.prototype.getLocationData = function (delay) {
    	/// <summary>
    	/// Retrieve the location data from FourSquare.
    	/// </summary>
    	/// <param name="delay"></param>
        var point = this;
        
        if ($.jStorage.get("locationCache" + point.id) == null) {
            // If the location data is not present in the cache, look it up
            setTimeout(function () {
                //d3.json("https://api.foursquare.com/v2/venues/search?ll=" + point.lat + "," + point.lon +
                //    "&radius=" + 100 + "&intent=browse&client_id=" + CLIENT_ID + "&client_secret=" + CLIENT_SECRET + "&v=20140509",
                //    function (jsonResponse) {
                //        console.log(point.id);
                //        console.log(jsonResponse);
                //        var venues = jsonResponse.response.venues;
                //        for (var i = 0; i < venues.length; i++) {
                //            if (!point.venue || venues[i].stats.checkinsCount > point.venue.stats.checkinsCount)
                //                point.venue = venues[i];
                //        }

                //        if (point.venue) {
                //            point.locationName = point.venue.name;
                //            $.jStorage.set("locationCache" + point.id, point.venue);
                //            var event = new Event("pointLocDataUpdated");
                //            dispatchEvent(event);
                //        }
                //        else {
                //            // If FourSquare knows nothing about the address, get the address from Open Street Map
                            d3.json("http://nominatim.openstreetmap.org/reverse?format=json&" + 
                                "lat=" + point.lat + "&lon=" + point.lon ,
                                function(openData){

                                    console.log(openData);
                                    if (openData.address.road != null) {
                                        point.locationName = openData.address.road + " ";
                                        if (openData.address.house_number != null)
                                            point.locationName += openData.address.house_number;
                                        $.jStorage.set("locationCache" + point.id, { name: point.locationName });
                                        var event = new Event("pointLocDataUpdated");
                                        dispatchEvent(event);
                                    }
                                })
                      //  }

                   // })

            }, delay);
        }
        else {
            // Otherwise read from the cache
            point.venue = $.jStorage.get("locationCache" + point.id);
            point.locationName = point.venue.name;
        }

        
    };
    
    return mobility_point;

})();