const express = require('express');
const router = express.Router();
const app = express();
const { DOMParser } = require('xmldom');
const cheerio = require('cheerio');
var logger = require('./utils/logger');
// const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 3000;
const port = 3000;
// const port = process.env.NODE_PORT || 3000;
let sitemapFile = '/sitemap.xml';
const axios = require('axios');
app.use(express.json({ limit: '100MB' }));
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
  var length = 0;
  var sitemaps = 0;
  var loopSitemaps = 0;
  var count = 0;
  let url1;
  let allURLs = [];
  let pageData = {};
  let allImages = [];
  let allPageLinks = [];
  let countPages = 0;
  let pdfPages = [];
  let failedURLs = [];
  let headerURLs = [];
  if (h1) {
    req.body.urls.forEach((pageUrl) => {
      let urlLen = req.body.urls.length;
      getH1Content(pageUrl, urlLen);
    });
  } else {
    // Get Sitemap content and parse it to DOM
    async function getSitemapURLs(sitemapFile, callback) {
      const sitemapURL = url + sitemapFile;
      console.log('checking sitemap exists:', sitemapURL);

      if(url == "https://www.bettersworthlaw.com" || url == "https://www.bettersworthlaw.com/"){
          console.log("premature Sitemap call");
          getNonSitemapURLS(url, "https://www.bettersworthlaw.com/sitemap");
      }
      else {
        axios.get(sitemapURL)
          .then(function (response) {
            // handle success
            // console.log(response);
            var sitemapContent = response.data;
            console.log('siteContent: ');
            var XMLSitemap = parseXMLSitemap(sitemapContent);
            console.log('xml: ');
            sitemaps = XMLSitemap.getElementsByTagName('sitemap');
            // var subSitemapContent = undefined;
            console.log('sitemaps.length:', sitemaps.length);
            if (sitemaps !== undefined && sitemaps.length > 0) {
              for (var i = 0; i < sitemaps.length; i++) {
                console.log('subFileName: ', sitemaps[i].getElementsByTagName('loc')[0].textContent);
                axios.get(sitemaps[i].getElementsByTagName('loc')[0].textContent)
                  .then(function (response) {
                    loopSitemaps = loopSitemaps + 1;
                    var subSitemapContent = response.data;
                    var subXMLSitemap = parseXMLSitemap(subSitemapContent);
                    console.log('sub: ', loopSitemaps, sitemaps.length);
                    if (loopSitemaps == sitemaps.length) {
                      callback(subXMLSitemap, "pass");
                    }
                    else {
                      callback(subXMLSitemap);
                    }
                  })
              }
            }
            else {
              callback(XMLSitemap, "pass");
            }
          })
          .catch(function (error) {
            console.log('Calling nonsitemap fn:' + url);
            getNonSitemapURLS(url, url);
          })
      }
    }

    // retrieving info from sitemap
    getSitemapURLs(sitemapFile, function (XMLSitemap, array_status) {
      try {
        var urls = XMLSitemap.getElementsByTagName('url');
        console.log('pulling urls from sitemap:');
        count++;

        for (var i = 0; i < urls.length; i++) {
          var urlElement = urls[i];
          var loc = urlElement.getElementsByTagName('loc')[0].textContent;
          allURLs.push(loc);
        }
        console.log('pages: ', array_status, allURLs);
        length = length + urls.length;
        if (array_status == "pass") {
          pageData = {
            allURLs: JSON.stringify(allURLs),
          };
          console.log('H1 no, sending Data: ', allURLs);
          res.send(pageData);
        }
      } catch (err) {
        console.log('err:', err);
      }
    });
  }

  async function getNonSitemapURLS(url, url1) {
    try {
      console.log('url', url);
      const response = await axios.get(url1);
      if (response.status === 200) {
        const html = response.data;
        let $ = cheerio.load(html);
        console.log('link count:', $('a').length);
        $('a').each(function () {
          var link = $(this);
          var linkUrl = link.attr('href');
          if (linkUrl !== '' && linkUrl != null && linkUrl !== undefined) {
            var newURL = '';
            if (linkUrl.charAt(0) === '/' || !linkUrl.startsWith('http')) {
              if (linkUrl.charAt(0) === '/') {
                linkUrl = linkUrl.substring(1);
              }
              newURL = url + "/" + linkUrl.split('#')[0];
              console.log('newURL:', newURL);
              if (!allPageLinks.includes(newURL) && !newURL.includes('tel') && newURL.startsWith(url)) {
                allPageLinks.push(newURL);
              }
            } else if (!allPageLinks.includes(linkUrl) && linkUrl.startsWith(url) && !linkUrl.includes('tel')) {
              allPageLinks.push(linkUrl);
            }
          }
        });
        allURLs = [];
        allURLs = allPageLinks;
        // console.log('allUrls length:', allURLs.length);
        // console.log('allURLs:', allURLs);
      }
      countPages = 0;
      allPageLinks.forEach((pageUrl) => {
        crawlnonsitemaparray(url, pageUrl, allPageLinks.length);
        // console.log("Crawling inner link: ", url, pageUrl, allPageLinks.length);
      });
      // res.send(pageData);
    } catch (err) {
      console.log('err:', url, err);
    }
  }

  async function crawlnonsitemaparray(url, pageUrl, len) {
    try {
      // console.log("Crawling inner link:", pageUrl, len)
      const response = await axios.get(pageUrl);
      if (response.status === 200) {
        const html = response.data;
        let $ = cheerio.load(html);
        // console.log('link count:', $('a').length);
        $('a').each(function () {
          var link = $(this);
          var linkUrl = link.attr('href');
          // console.log("found link: ", linkUrl);
          if (linkUrl !== '' && linkUrl != null && linkUrl !== undefined) {
            var newURL = '';
            if (linkUrl.charAt(0) === '/' || !linkUrl.startsWith('http')) {
              if (linkUrl.charAt(0) === '/') {
                linkUrl = linkUrl.substring(1);
              }
              newURL = url + "/" + linkUrl.split('#')[0];
              console.log('newURL:', newURL);
              if (!allURLs.includes(newURL) && !newURL.includes('tel') && newURL.startsWith(url)) {
                allURLs.push(newURL);
              }
            } else if (!allURLs.includes(linkUrl) && linkUrl.startsWith(url) && !linkUrl.includes('tel')) {
              allURLs.push(linkUrl);
            }
          }
        });
        // allURLs = [];
        countPages = countPages + 1;
        console.log("crawling page if: ", countPages);
      }
      else {
        countPages = countPages + 1;
        console.log("crawling page else: ", countPages);
      }
      if (countPages == len) {
        // console.log("crawl completed, sending H1");
        pageData = {
          allURLs: JSON.stringify(allURLs),
        };
        res.send(pageData);
        // console.log("H1 sent from Green:", pageUrl);
      }

    } catch (err) {
      countPages = countPages + 1;
      console.log("crawling page catch: ", countPages);
      // console.log('err:', pageUrl, err);
      if (countPages == len) {
        pageData = {
          allURLs: JSON.stringify(allURLs),
        };
        res.send(pageData);
      }
    }
  }

  async function getH1Content(pageUrl, len) {
    try {
      // console.log("Pulling H1 for: ", pageUrl)
      const response = await axios.get(pageUrl);
      if (response.status == 200) {
        // console.log("H1 pulled: ", pageUrl);
        const html = response.data;
        let $ = cheerio.load(html);
        let q = $('h1').text().trim();
        h1Val = {
          url: pageUrl,
          h1: q,
          statusCode: response.status
        };
        headerURLs.push(h1Val);
        countPages = countPages + 1;
        console.log(len, countPages, " Status: ", response.status, pageUrl)
        $ = "";
      }
      else {
        h1Val = {
          url: pageUrl,
          statusCode: response.status
        };
        headerURLs.push(h1Val);
        countPages +=  1;
        console.log(len, countPages, " Status: ", response.status, pageUrl)
      }
      if (countPages == len) {
        console.log("crawl completed, sending H1");
        pageData = {
          h1: JSON.stringify(headerURLs)
        };
        res.send(pageData);
        console.log("H1 sent from Green:", pageUrl);
      }

    } catch (err) {
      // h1Val = {
      //   url: pageUrl
      // };
      // headerURLs.push(h1Val);
      countPages = countPages + 1;
      // console.log('err:', pageUrl, err);
      console.log(len, countPages, pageUrl)
      // console.log("H1 sent from Red:", pageUrl);
      if (countPages == len) {
        // console.log("crawl completed, sending H1 from catch");
        pageData = {
          h1: JSON.stringify(headerURLs)
        };
        res.send(pageData);
        // console.log("H1 sent from Green:", pageUrl);
      }
    }
  }

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
