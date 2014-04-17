
var mobility_point = (function () {

    function mobility_point(id, lat, lon) {
        this.id = id;
        this.lat = lat;
        this.lon = lon;
        this.count = 0;
        this.time = 0;
        this.visits = [];
        this.buckets = [];

        this.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    };

    mobility_point.prototype.clear = function () {
        this.count = 0;
        this.time = 0;
        this.visits = [];
        this.buckets = [];
    };

    mobility_point.prototype.update = function (count, time, visits) {
        this.count = count;
        this.time = time;
        this.visits = visits;
    };
    
    mobility_point.prototype.createBuckets = function () {
        var that = this;
        this.buckets = [];
        this.days.forEach(function (d) {
            var ind = that.buckets.push({ day: d, total: 0, timeBucket: [] });
            for (var i = 0; i < 24; i++)
                that.buckets[ind - 1].timeBucket.push({ count: 0, total: 0 });
        });
    };

    mobility_point.prototype.bucketData = function () {
        this.createBuckets();

        for (var l = 0; l < this.visits.length; l++) {
            var filteredPeriods = [[], [], [], [], [], [], []];

            var visit = this.visits[l];
            var currDay = new Date(visit.start);

            do {
                var periodStart = Math.max(currDay.setHours(0, 0, 0, 0), visit.start);
                var periodEnd = Math.min(currDay.setHours(23, 59, 59, 999), visit.end);

                filteredPeriods[(currDay.getDay() + 6) % 7].push({ from: periodStart, to: periodEnd });
                currDay.setDate(currDay.getDate() + 1);

            } while (periodEnd < visit.end);

            var startFound = false;
            for (var day = 0; day < 7; day++) {
                for (var i = 0; i < filteredPeriods[day].length; i++) {
                    currDay = new Date(filteredPeriods[day][i].from);
                    var j = 0;
                    do {
                        var periodStart = Math.max(currDay.setHours(j, 0, 0, 0), visit.start);
                        var periodEnd = Math.min(currDay.setHours(j, 59, 59, 999), visit.end);

                        if (!startFound && visit.start > currDay.setHours(j, 0, 0, 0) && visit.start < currDay.setHours(j + 1, 0, 0, 0))
                            startFound = true;
                        else if (!startFound) {
                            j++;
                            continue;
                        }

                        this.buckets[day].timeBucket[j].total += (periodEnd - periodStart) / (1000 * 60 * 60);
                        this.buckets[day].timeBucket[j].count++;
                        this.buckets[day].total += (periodEnd - periodStart) / (1000 * 60 * 60);

                        j++;

                    } while (j < 24 && periodEnd < visit.end)
                }
            }
        }

    };

    
    return mobility_point;

})();