/// <reference path="../jquery/jquery.min.js" />
/// <reference path="../jStorage/jstorage.min.js" />
/// 
/// ======================================================================================================
/// File: MOBILITY-LOG.js
/// ======================================================================================================
/// <summary>
/// The class that logs user interaction with the visualization and then will send the statistics 
/// to the Sensible server.
/// </summary>
/// <author>Marta Magiera</author>
/// ======================================================================================================

var mobility_log = (function () {

    function mobility_log(serverUrl) {
    	/// <summary>
    	/// The constructor for the mobility-log object.
    	/// </summary>
        var chart = this;

        
        if ($.jStorage.get("logCache") != null)
            this.log = $.jStorage.get("logCache");
        else
            this.log = [];

        this.allowedEvents = ["overlayOpened", "overlayClosed",
                              "treeEvent", "calendarEvent",
                              "mapOpened", "mapClosed",
                              "filterEvent",                              
                              "timelineEvent",
                              "timelinePlayback", "timelinePlaybackStopped", "timelinePlaybackEvent",
                              "mapEvent",
                              "mapDetailOpened", "mapDetailClosed",
                              "radialChartEvent", "radialChartSwitch", "barChartEvent"];
    };

    mobility_log.prototype.logEvent = function (event) {
    	/// <summary>
    	/// Log an event into the log cache. 
    	/// </summary>
    	/// <param name="event">The event to be logged</param>       
        if (this.allowedEvents.indexOf(event) != -1) {
            this.log.push({ timestamp: Date.now(), event: event});
            $.jStorage.set("logCache", this.log);
        }
        
    };

    mobility_log.prototype.clearLog = function () {
    	/// <summary>
    	/// Clear the event log 
        /// </summary>
        this.log = [];
        $.jStorage.set("logCache", this.log);
    }


   

    return mobility_log;

})();