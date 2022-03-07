const express = require('express');
const router = express.Router();
const app = express();
var XMLHttpRequest = require("xhr2");
const { DOMParser } = require('xmldom');
const got = require('got');
const cheerio = require('cheerio');
var logger = require('./utils/logger');
// const { get } = require('cheerio/lib/api/traversing');
const { create } = require('xmlbuilder2');
// const fs = require('fs');
const moment = require('moment');

const port = 3000;
let sitemapFile = 'sitemap.xml';
let isPage;
app.use(express.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use("/", router);

router.get('/test', (req, res) => {
    logger.info("Server Sent A Hello World!");
    res.send("Hello from test!");
});

router.post('/estimator', (req, res) => {
    const url = req.body.url;
    const h1 = req.body.h1;
    var length = 0;
    var sitemaps = 0;
    var count = 0;
    let allURLs = [];
    let blogs = [];
    let pages = [];
    let pageData = {};
    let allImages = [];
    let scrapeImages = false;
    let countPages = 0;
    let pdfPages = [];
    let failedURLs = [];
    let headerURLs = [];

    // function getSitemapURLs(sitemapFile, callback) {
    //     setTimeout(() => {
    //         var xhttp = new XMLHttpRequest();
    //         xhttp.onreadystatechange = function () {
    //             if (this.readyState == 4 && this.status == 200) {
    //                 var sitemapContent = this.responseText;
    //                 var XMLSitemap = parseXMLSitemap(sitemapContent);
    //                 sitemaps = XMLSitemap.getElementsByTagName('sitemap');
    //                 var subSitemapContent = undefined;
    //                 if (sitemaps !== undefined && sitemaps.length > 0) {
    //                     for (var i = 0; i < sitemaps.length; i++) {
    //                         var x = new XMLHttpRequest();
    //                         x.onreadystatechange = function () {
    //                             if (this.readyState == 4 && this.status == 200) {
    //                                 subSitemapContent = this.responseXML;
    //                                 if (subSitemapContent !== undefined)
    //                                     callback(subSitemapContent);
    //                             }
    //                         };
    //                         x.open('GET', sitemaps[i].getElementsByTagName('loc')[0].textContent, true);
    //                         x.send();
    //                     }
    //                 }
    //                 callback(XMLSitemap);
    //             }
    //         };
    //         xhttp.open('GET', url + sitemapFile, true);
    //         xhttp.send();
    //     }, 5000);
    // }

    function getSitemapURLs(sitemapFile, callback) {
        setTimeout(() => {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var sitemapContent = xhttp.responseText;
                    // console.log('siteContent: ', sitemapContent);
                    var XMLSitemap = parseXMLSitemap(sitemapContent);
                    // console.log('xml: ', XMLSitemap)
                    sitemaps = XMLSitemap.getElementsByTagName('sitemap');
                    // var subSitemapContent = undefined;
                    if (sitemaps !== undefined && sitemaps.length > 0) {
                        var subSitemapContent = "";
                        for (var i = 0; i < sitemaps.length; i++) {
                            var x = new XMLHttpRequest();
                            x.onreadystatechange = function () {
                                if (this.readyState == 4 && this.status == 200) {
                                    subSitemapContent = this.responseText;
                                    callback(parseXMLSitemap(subSitemapContent));
                                }
                            };
                            console.log('subFileName: ', sitemaps[i].getElementsByTagName('loc')[0].textContent);
                            x.open('GET', sitemaps[i].getElementsByTagName('loc')[0].textContent, true);
                            x.send();
                        }
                    }
                    else {
                        callback(XMLSitemap);
                    }
                }
            };
            xhttp.open('GET', url + sitemapFile, true);
            xhttp.send();
        }, 5000);
    }

    getSitemapURLs(sitemapFile, function (XMLSitemap) {
        console.log("inside sitemapcrawl" + XMLSitemap);
        var urls = XMLSitemap.getElementsByTagName("url");
        count++;
        for (var i = 0; i < urls.length; i++) {
            var urlElement = urls[i];
            var loc = urlElement.getElementsByTagName("loc")[0].textContent; // + "\\n";
            allURLs.push(loc);
        }
        console.log(allURLs);
        length = length + urls.length;
        if (h1 == true) {
            if (sitemaps.length <= 1) {
                allURLs.forEach(pageUrl => {
                    getImages(pageUrl);
                });
            } else {
                if (sitemaps[sitemaps.length - 1].baseURI !== XMLSitemap.URL && ((sitemaps.length + 1) == count)) {
                    allURLs.forEach(pageUrl => {
                        getImages(pageUrl);
                    });
                }
            }
        } else {
            pageData = {
                "allURLs": JSON.stringify(allURLs),
            };
            res.send(pageData);
        }
    });

    async function getImages(pageUrl) {
        try {
            failedURLs.splice(failedURLs.indexOf(pageUrl), 1);
            const response = await got(pageUrl, { retry: { limit: 3, methods: ["GET", "POST"], timeout: 0 } });
            // if (pageUrl.includes('.pdf')) {
            //     pdfPages.push(pageUrl);
            // }
            const html = response.body;
            const $ = cheerio.load(html);
            if (h1) {
                let q = $('h1').text();
                h1Val = {
                    url: pageUrl,
                    h1: q
                };
                headerURLs.push(h1Val);
            }
            // console.log('image count:', $("img").length);
            // console.log(pageUrl);
            // console.log($('h1').text());
            // headerURLs['url'] = pageUrl;
            // let q = $('h1').text();
            // h1Val = {
            //     url: pageUrl,
            //     h1: q
            // };
            // headerURLs.push(h1Val);

            // $("img").each(function () {
            //     var image = $(this);
            //     var src = image.attr("src");
            //     if (src !== '' && src != null && src !== undefined) {
            //         if (src.charAt(0) === '/') {
            //             src = src.substring(1);
            //         }
            //         if (!allImages.includes(url + src))
            //         allImages.push(url + src);
            //     }
            // });
            countPages = countPages + 1;
            // console.log('count: ', + countPages + ' ' + allURLs.length + ' ' + pageUrl);

            if (countPages === allURLs.length) {
                // console.log(headerURLs);
                scrapeImages = true;
                // console.log('Images:', allImages.length);
                if (h1) {
                    pageData = {
                        "allURLs": JSON.stringify(allURLs),
                        "h1": JSON.stringify(headerURLs),
                        // "h1": h1Val 
                    };
                }
                // console.log('All Images:', allImages);
                res.send(pageData);
            }
        } catch (err) {
            failedURLs.push(pageUrl);
            console.log('err:', err);
        }
    }

    // parse a text string into an XML DOM object
    function parseXMLSitemap(content) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(content, 'text/xml');
        return xmlDoc;
    }
});

app.listen(port, function (err) {
    if (err)
        console.log(err);
    console.log(`Example app listening on port ${port}!`)
});
