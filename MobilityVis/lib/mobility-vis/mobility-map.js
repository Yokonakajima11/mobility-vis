var mobility_map = (function () {

    function mobility_map(divId, lat, long) {
        this.map = po.map()
            .container(document.getElementById(divId).appendChild(po.svg("svg")));
        var n = Math.pow(2, 12);//zoom
        var xtile = ((long + 180) / 360) * n
        var ytile = (1 - (Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI)) / 2 * n

        this.map
            .add(po.interact())
            .add(po.image()
            .url(po.url("http://{S}tile.cloudmade.com"
            + "/b8dd6d159c1f4af48b74fc1a7c17a592"
            + "/1/256/{Z}/{X}/{Y}.png")
            .hosts(["a.", "b.", "c.", ""])));

        this.map.center({ lat: 55.786, lon: 12.521 });

    };

    return mobility_map;

})();