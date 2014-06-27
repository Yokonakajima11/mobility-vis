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

    function mobility_log(serverUrl, token) {
    	/// <summary>
    	/// The constructor for the mobility-log object.
        /// </summary>
        /// <param name="serverUrl" type="String">URL to submit logs to</param>
        /// <param name="token" type="String">User auth token</param>
        var chart = this;

        this.uploadUrl = serverUrl;
        this.token = token;

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
                              "radialChartEvent", "radialChartSwitch", "barChartEvent",
                              "helpOpened", "helpClosed"];

        var that = this;

        setTimeout(function () {
            that.submitLogs();
        }, 1000 * 60 * 5);
    };

    mobility_log.prototype.logEvent = function (event) {
    	/// <summary>
    	/// Log an event into the log cache. 
    	/// </summary>
    	/// <param name="event">The event to be logged</param>       
        if (this.allowedEvents.indexOf(event) != -1) {
            this.log.push([Math.round(Date.now()/1000), event]);
            $.jStorage.set("logCache", this.log);
        }
        
    };

    mobility_log.prototype.clearLog = function () {
        /// <summary>
        /// Clear the event log 
        /// </summary>
        this.log = [];
        $.jStorage.set("logCache", this.log);
    };


    mobility_log.prototype.submitLogs = function() {
    	/// <summary>
    	/// Submit the logs to the server.
        /// </summary>
        if(this.log.length != 0)
            $.ajax({
                url: this.uploadUrl,
                type: "POST",
                data: {
                    'bearer_token': this.token,
                    'appid': 'sensibleexplorer',
                    'events': JSON.stringify(this.log)
                }, 
                success: function (data, textStatus, jqXHR) {
                    console.log(data)
                    console.log(textStatus)

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR.responseText)
                    console.log(jqXHR.statusText)
                }
            });

        this.clearLog();

        var that = this;

        setTimeout(function () {
            that.submitLogs();
        }, 1000 * 60 * 5);

    };

   

    return mobility_log;

})();