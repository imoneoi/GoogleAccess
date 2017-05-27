(function() {
    /** Initialization **/
    chrome.proxy.settings.set({
        value:{
            mode:"system"
        },
        scope:"regular"
    }, function() {
        console.info("Cacelled proxy.");
    });

    function GetPassword(d, p) {
        for (var m = (d + p).replace("T", ""), u = [], v = 0; 16 > v; v++) u.push(String.fromCharCode(parseInt(m.charCodeAt(v) + m.charCodeAt(v + 16) + m.charCodeAt(v + 32)) / 3));
        return u.join("");
    }

    function GenGUID() {
        function d() {
            return Math.floor(65536 * (1 + Math.random())).toString(16).substring(1);
        }
        return d() + d() + "-" + d() + "-" + d() + "-" + d() + "-" + d() + d() + d();
    }

    function offlineTime() {
            return new Date().toISOString().substr(0, 19).replace(/-/g, "").replace(/:/g, "");
    }

    var Crypt = { /* crypt codes */
        EStr:function(d, p) {
            d = String(d);
            p = String(p);
            if (0 == d.length) return "";
            var m = Crypt.strToLongs(d.utf8Encode()), u = Crypt.strToLongs(p.utf8Encode().slice(0, 16)), m = Crypt.encode(m, u);
            return Crypt.longsToStr(m).base64Encode();
        },
        DStr:function(d, p) {
            d = String(d);
            p = String(p);
            if (0 == d.length) return "";
            var m = Crypt.strToLongs(d.base64Decode()), u = Crypt.strToLongs(p.utf8Encode().slice(0, 16)), m = Crypt.decode(m, u), m = Crypt.longsToStr(m), m = m.replace(/\0+$/, "");
            return m.utf8Decode();
        },
        encode:function(d, p) {
            2 > d.length && (d[1] = 0);
            for (var m = d.length, u = d[m - 1], v, n, r = Math.floor(6 + 52 / m), b = 0; 0 < r--; ) {
                b += 2654435769;
                n = b >>> 2 & 3;
                for (var l = 0; l < m; l++) v = d[(l + 1) % m], u = (u >>> 5 ^ v << 2) + (v >>> 3 ^ u << 4) ^ (b ^ v) + (p[l & 3 ^ n] ^ u), 
                u = d[l] += u;
            }
            return d;
        },
        decode:function(d, p) {
            for (var m = d.length, u, v = d[0], n, r = 2654435769 * Math.floor(6 + 52 / m); 0 != r; ) {
                n = r >>> 2 & 3;
                for (var b = m - 1; 0 <= b; b--) u = d[0 < b ? b - 1 :m - 1], u = (u >>> 5 ^ v << 2) + (v >>> 3 ^ u << 4) ^ (r ^ v) + (p[b & 3 ^ n] ^ u), 
                v = d[b] -= u;
                r -= 2654435769;
            }
            return d;
        },
        strToLongs:function(d) {
            for (var p = Array(Math.ceil(d.length / 4)), m = 0; m < p.length; m++) p[m] = d.charCodeAt(4 * m) + (d.charCodeAt(4 * m + 1) << 8) + (d.charCodeAt(4 * m + 2) << 16) + (d.charCodeAt(4 * m + 3) << 24);
            return p;
        },
        longsToStr:function(d) {
            for (var p = Array(d.length), m = 0; m < d.length; m++) p[m] = String.fromCharCode(d[m] & 255, d[m] >>> 8 & 255, d[m] >>> 16 & 255, d[m] >>> 24 & 255);
            return p.join("");
        }
    };

    /* define base64 & utf8 */
    "undefined" == typeof String.prototype.utf8Encode && (String.prototype.utf8Encode = function() {
        return unescape(encodeURIComponent(this));
    });
    "undefined" == typeof String.prototype.utf8Decode && (String.prototype.utf8Decode = function() {
        try {
            return decodeURIComponent(escape(this));
        } catch (d) {
            return this;
        }
    });
    "undefined" == typeof String.prototype.base64Encode && (String.prototype.base64Encode = function() {
        return this;
    });
    "undefined" == typeof String.prototype.base64Decode && (String.prototype.base64Decode = function() {
        return this;
    });

    var Time = offlineTime(), UUID = GenGUID(), Password = GetPassword(UUID, Time);
    var defServer = "https://www.ischolar.top/app/ext/", rootServers = [], pacScript, pacScriptAllDirect, srvList = [], srvSpeed = [], proxyOk = 0, speedNo = 0;

    function okSpeed() {
        srvSpeed = srvSpeed.sort(function(a, b) {
            return b.speed - a.speed;
        });

        var AllProxy = 0;
        pacScript = 'function FindProxyForURL(url, host) {\nvar D="DIRECT;", P = "' + srvSpeed[0].type + ' ' + srvSpeed[0].host + ':' + srvSpeed[0].port + ';";\n' + pacScript + "\n}";
        pacScriptAllProxy = 'function FindProxyForURL(url, host) {\nvar P = "' + srvSpeed[0].type + ' ' + srvSpeed[0].host + ':' + srvSpeed[0].port + ';"; return P;\n}';

        console.log(srvSpeed);
        chrome.proxy.settings.set({
            value:{
                mode:"pac_script",
                pacScript:{
                    data: AllProxy ? pacScriptAllProxy : pacScript
                }
            },
            scope:"regular"
        }, function() {
            console.info("Proxy is set");
        });
    }

    function testSpeed(idx) {
        srvSpeed[idx].startTime = Date.now();
        var srv = srvSpeed[idx];
        $.ajax({
            type:"GET",
            url:"https://" + srv.host + ":" + srv.port + "/speed_test?size=100&t=" + srv.startTime,
            timeout:2e3,
            success:function() {
                srvSpeed[idx].speed = Math.floor(1e5 / (Date.now() - srv.startTime));
                if(++speedNo == srvSpeed.length) okSpeed();
            },
            error:function() {
                if(++speedNo == srvSpeed.length) okSpeed();
            }
        });
    }

    function setProxy() {
        if(!srvList.length) console.info("Unable to find servers.");
        else {
            //test speed
            var idx, addr; for(idx in srvList) {
                addr = srvList[idx].split(":");
                srvSpeed.push({
                    type: addr[0],
                    host: addr[1],
                    port: addr[2],
                    speed: -1
                });
            }
            for(idx in srvSpeed) testSpeed(idx);
        }
    }

    function getInfo() {
        var report = {links: ["https://www.baidu.com"]};
        $.ajax({
            type:"POST",
            tryCount:0,
            retryLimit:2,
            url: defServer + "updateTaskRule2?uuid=" + UUID + "&time=" + Time,
            success: function() {
                $.ajax({
                    type: "POST",
                    url: defServer + "updateTaskRule3?uuid=" + UUID + "&time=" + Time, 
                    data: {
                        D: Crypt.EStr(JSON.stringify(report), Password)
                    },
                    success: function(data) {
                        data = JSON.parse(Crypt.DStr(data, Password));

                        pacScript = data.pacScriptStr;
                        srvList = srvList.concat(data.proxyServer);

                        if(++proxyOk == 2) setProxy();
                    },
                    error: function() {
                        if(++proxyOk == 2) setProxy();
                    }
                });
                $.ajax({
                    type: "GET",
                    url: defServer + "updateTaskRule6?uuid=" + UUID + "&time=" + Time, 
                    success: function(data) {
                        data = JSON.parse(Crypt.DStr(data, Password));
                        srvList = srvList.concat(data.proxyServer);
                        srvList.push(data.backupServer);

                        if(++proxyOk == 2) setProxy();
                    },
                    error: function() {
                        if(++proxyOk == 2) setProxy();
                    }
                });
            }
        });
    }

    //set root server
    function setServer(idx) {
        $.ajax({
            url: atob(rootServers[idx]) + "static/test.json?t=" + Date.now(),
            success: function() {
                defServer = atob(rootServers[idx]) + "app/ext/";
                getInfo();
            },
            error: function() {
                if(idx+1 < rootServers.length) setServer(idx+1);
                else console.info("No root servers.");
            }
        })
    }

    $.ajax({
        url: "https://o4175vz27.qnssl.com/c.json?t=" + Date.now(),
        success: function(d) {
            d = d.RSS;

            //filter
            var idx, item, rand = Math.round(Math.random() * 100), final = [];
            for(idx in d) {
                item = d[idx];
                if(rand <= item.percentHigh && rand >= item.percentLow) rootServers.push(item.name);
            }
            for(idx in d) {
                item = d[idx];
                if(rootServers.indexOf(item.name) == -1) rootServers.push(item.name);
            }
            //set
            setServer(0);
        },
        error: function() {
            console.info("No root server list.");
        }
    });
})();