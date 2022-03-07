const express = require('express');
const router = express.Router();
const app = express();
var XMLHttpRequest = require('xhr2');
const { DOMParser } = require('xmldom');
const got = require('got');
const cheerio = require('cheerio');
var logger = require('./utils/logger');
const port = 3000;
let sitemapFile = '/sitemap.xml';
app.use(express.json());
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use('/', router);

router.get('/test', (req, res) => {
  logger.info('Server Sent A Hello World!');
  res.send('Hello from test!');
});

app.post('/estimator', (req, res) => {
  const url = req.body.url;
  const h1 = req.body.h1;
  // console.log('url', url);
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
            for (var i = 0; i < sitemaps.length; i++) {
              var x = new XMLHttpRequest();
              x.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                  var subSitemapContent = this.responseText;
                  var subXMLSitemap = parseXMLSitemap(subSitemapContent);
                  // console.log('sub: ', subXMLSitemap)
                  callback(subXMLSitemap);
                }
              };
              // console.log('subFileName: ', sitemaps[i].getElementsByTagName('loc')[0].textContent);
              x.open('GET', sitemaps[i].getElementsByTagName('loc')[0].textContent, true);
              x.send();
            }
          }
          callback(XMLSitemap);
        }
      };
      xhttp.open('GET', url + sitemapFile, true);
      xhttp.send();
    }, 5000);
  }

  // console.log('start');
  getSitemapURLs(sitemapFile, function (XMLSitemap) {
    try {
      var urls = XMLSitemap.getElementsByTagName('url');
      // console.log('urls:', urls)
      count++;
      for (var i = 0; i < urls.length; i++) {
        var urlElement = urls[i];
        var loc = urlElement.getElementsByTagName('loc')[0].textContent; // + "\\n";
        allURLs.push(loc);
      }
      length = length + urls.length;
      allURLs.forEach((pageUrl) => {
        // console.log('pageUrl: ', pageUrl);
        getImages(pageUrl);
      });
    } catch (err) {
      console.log('err:', err);
    }
  });

  async function getImages(pageUrl) {
    try {
      // if (h1) {

      // }
      failedURLs.splice(failedURLs.indexOf(pageUrl), 1);
      const response = await got(pageUrl, { retry: { limit: 3, methods: ['GET', 'POST'], timeout: 0 } });

      const html = response.body;
      const $ = cheerio.load(html);
      let q = $('h1').text();
      h1Val = {
        url: pageUrl,
        h1: q
      };
      headerURLs.push(h1Val);
      countPages = countPages + 1;
      // console.log('count: ', +countPages + ' ' + allURLs.length + ' ' + pageUrl);
      if (countPages === allURLs.length) {
        scrapeImages = true;
        debugger;
        pageData = {
          allURLs: JSON.stringify(allURLs),
          h1: JSON.stringify(headerURLs),
        };
        res.send(pageData);
      }
    } catch (err) {
      failedURLs.push(pageUrl);
      console.log('err:', err);
    }
  }

  // function effortcalculation(numberOfItems) {
  //   var totaleffortpages = Math.ceil((5 * numberOfItems) / 60);
  //   var effortData = {
  //     totalEffortHrs: totaleffortpages,
  //     totalDays: Math.ceil(totaleffortpages / 8),
  //   };
  //   return effortData;
  // }

  // parse a text string into an XML DOM object
  function parseXMLSitemap(sitemapContent) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');
    return xmlDoc;
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
