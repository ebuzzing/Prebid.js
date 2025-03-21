import { logWarn, isArray, isFn, deepAccess, formatQS } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'freewheel-ssp';
const GVL_ID = 285;

const PROTOCOL = getProtocol();
const FREEWHEEL_ADSSETUP = PROTOCOL + '://ads.stickyadstv.com/www/delivery/swfIndex.php';
const MUSTANG_URL = PROTOCOL + '://cdn.stickyadstv.com/mustang/mustang.min.js';
const PRIMETIME_URL = PROTOCOL + '://cdn.stickyadstv.com/prime-time/';
const USER_SYNC_URL = PROTOCOL + '://ads.stickyadstv.com/auto-user-sync';

function getProtocol() {
  return 'https';
}

function isValidUrl(str) {
  if (!str) {
    return false;
  }

  // regExp for url validation
  var pattern = /^(https?|ftp|file):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return pattern.test(str);
}

function getBiggerSize(array) {
  var result = [0, 0];
  for (var i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] > result[0] * result[1]) {
      result = array[i];
    }
  }
  return result;
}

function getBiggerSizeWithLimit(array, minSizeLimit, maxSizeLimit) {
  var minSize = minSizeLimit || [0, 0];
  var maxSize = maxSizeLimit || [Number.MAX_VALUE, Number.MAX_VALUE];
  var candidates = [];

  for (var i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] >= minSize[0] * minSize[1] && array[i][0] * array[i][1] <= maxSize[0] * maxSize[1]) {
      candidates.push(array[i]);
    }
  }

  return getBiggerSize(candidates);
}

/*
* read the pricing extension with this format: <Extension type='StickyPricing'><Price currency="EUR">1.0000</Price></Extension>
* @return {object} pricing data in format: {currency: "EUR", price:"1.000"}
*/
function getPricing(xmlNode) {
  var pricingExtNode;
  var princingData = {};

  var extensions = xmlNode.querySelectorAll('Extension');
  // Nodelist.forEach is not supported in IE and Edge
  // Workaround given here https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10638731/
  Array.prototype.forEach.call(extensions, function(node) {
    if (node.getAttribute('type') === 'StickyPricing') {
      pricingExtNode = node;
    }
  });

  if (pricingExtNode) {
    var priceNode = pricingExtNode.querySelector('Price');
    princingData = {
      currency: priceNode.getAttribute('currency'),
      price: priceNode.textContent
    };
  } else {
    logWarn('PREBID - ' + BIDDER_CODE + ': No bid received or missing pricing extension.');
  }

  return princingData;
}

/*
* Read the StickyBrand extension with this format:
* <Extension type='StickyBrand'>
*   <Domain><![CDATA[minotaur.com]]></Domain>
*   <Sector><![CDATA[BEAUTY & HYGIENE]]></Sector>
*   <Advertiser><![CDATA[James Bond Trademarks]]></Advertiser>
*   <Brand><![CDATA[007 Seven]]></Brand>
* </Extension>
* @return {object} pricing data in format: {currency: "EUR", price:"1.000"}
*/
function getAdvertiserDomain(xmlNode) {
  var domain = [];
  var brandExtNode;
  var extensions = xmlNode.querySelectorAll('Extension');
  // Nodelist.forEach is not supported in IE and Edge
  // Workaround given here https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10638731/
  Array.prototype.forEach.call(extensions, function(node) {
    if (node.getAttribute('type') === 'StickyBrand') {
      brandExtNode = node;
    }
  });

  // Currently we only return one Domain
  if (brandExtNode) {
    var domainNode = brandExtNode.querySelector('Domain');
    domain.push(domainNode.textContent);
  } else {
    logWarn('PREBID - ' + BIDDER_CODE + ': No bid received or missing StickyBrand extension.');
  }

  return domain;
}

function hashcode(inputString) {
  var hash = 0;
  var char;
  if (inputString.length == 0) return hash;
  for (var i = 0; i < inputString.length; i++) {
    char = inputString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function getCreativeId(xmlNode) {
  var creaId = '';
  var adNodes = xmlNode.querySelectorAll('Ad');
  // Nodelist.forEach is not supported in IE and Edge
  // Workaround given here https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10638731/
  Array.prototype.forEach.call(adNodes, function(el) {
    creaId += '[' + el.getAttribute('id') + ']';
  });

  return creaId;
}

function getValueFromKeyInImpressionNode(xmlNode, key) {
  var value = '';
  var impNodes = xmlNode.querySelectorAll('Impression'); // Nodelist.forEach is not supported in IE and Edge
  var isRootViewKeyPresent = false;
  var isAdsDisplayStartedPresent = false;
  Array.prototype.forEach.call(impNodes, function (el) {
    if (isRootViewKeyPresent && isAdsDisplayStartedPresent) {
      return value;
    }
    isRootViewKeyPresent = false;
    isAdsDisplayStartedPresent = false;
    var text = el.textContent;
    var queries = text.substring(el.textContent.indexOf('?') + 1).split('&');
    var tempValue = '';
    Array.prototype.forEach.call(queries, function (item) {
      var split = item.split('=');
      if (split[0] == key) {
        tempValue = split[1];
      }
      if (split[0] == 'reqType' && split[1] == 'AdsDisplayStarted') {
        isAdsDisplayStartedPresent = true;
      }
      if (split[0] == 'rootViewKey') {
        isRootViewKeyPresent = true;
      }
    });
    if (isAdsDisplayStartedPresent) {
      value = tempValue;
    }
  });
  return value;
}

function getDealId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'dealId');
}

function getBannerId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'adId');
}

function getCampaignId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'campaignId');
}

/**
 * returns the top most accessible window
 */
function getTopMostWindow() {
  var res = window;

  try {
    while (top !== res) {
      if (res.parent.location.href.length) { res = res.parent; }
    }
  } catch (e) {}

  return res;
}

function getComponentId(inputFormat) {
  var component = 'mustang'; // default component id

  if (inputFormat && inputFormat !== 'inbanner') {
    // format identifiers are equals to their component ids.
    component = inputFormat;
  }

  return component;
}

function getAPIName(componentId) {
  componentId = componentId || '';

  // remove dash in componentId to get API name
  return componentId.replace('-', '');
}

function getBidFloor(bid, config) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: getFloorCurrency(config),
      mediaType: typeof bid.mediaTypes['banner'] == 'object' ? 'banner' : 'video',
      size: '*',
    });
    return bidFloor?.floor;
  } catch (e) {
    return -1;
  }
}

function getFloorCurrency(config) {
  return config.getConfig('floors.data.currency') != null ? config.getConfig('floors.data.currency') : 'USD';
}

function formatAdHTML(bid, size) {
  var integrationType = bid.params.format;

  var divHtml = '<div id="freewheelssp_prebid_target" style="width:' + size[0] + 'px;height:' + size[1] + 'px;"></div>';

  var script = '';
  var libUrl = '';
  if (integrationType && integrationType !== 'inbanner') {
    libUrl = PRIMETIME_URL + getComponentId(bid.params.format) + '.min.js';
    script = getOutstreamScript(bid);
  } else {
    libUrl = MUSTANG_URL;
    script = getInBannerScript(bid, size);
  }

  return divHtml +
  '<script type=\'text/javascript\'>' +
  '(function() {' +
  '  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;' +
  '  st.src = \'' + libUrl + '\';' +
  '  st.onload = function(){' +
  '    var vastLoader = new window.com.stickyadstv.vast.VastLoader();' +
  '    var vast = vastLoader.getVast();' +
  // get the top most accessible window
  '    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();' +
  // inject the xml in the Vast object as string
  '    vast.setXmlString(topWindow.freewheelssp_cache["' + bid.adUnitCode + '"]);' +
  // force ad parsing on the given vast xml
  '    vastLoader.parseAds(vast, {' +
  '      onSuccess: function() {' + script + ' }' +
  '    });' +
  '  };' +
  '  document.head.appendChild(st);' +
  '})();' +
  '</script>';
}

var getInBannerScript = function(bid, size) {
  return 'var config = {' +
  '      preloadedVast:vast,' +
  '      autoPlay:true' +
  '    };' +
  '    var ad = new window.com.stickyadstv.vpaid.Ad(document.getElementById("freewheelssp_prebid_target"),config);' +
  '    (new window.com.stickyadstv.tools.ASLoader(' + bid.params.zoneId + ', \'' + getComponentId(bid.params.format) + '\')).registerEvents(ad);' +
  '    ad.initAd(' + size[0] + ',' + size[1] + ',"",0,"","");';
};

var getOutstreamScript = function(bid) {
  var config = bid.params;

  // default placement if no placement is set
  if (!config.hasOwnProperty('domId') && !config.hasOwnProperty('auto') && !config.hasOwnProperty('p') && !config.hasOwnProperty('article')) {
    if (config.format === 'intext-roll') {
      config.iframeMode = 'dfp';
    } else {
      config.domId = 'freewheelssp_prebid_target';
    }
  }

  var script = 'var config = {' +
  '  preloadedVast:vast,' +
  '  ASLoader:new window.com.stickyadstv.tools.ASLoader(' + bid.params.zoneId + ', \'' + getComponentId(bid.params.format) + '\')';

  for (var key in config) {
    // dont' send format parameter
    // neither zone nor vastUrlParams value as Vast is already loaded
    if (config.hasOwnProperty(key) && key !== 'format' && key !== 'zone' && key !== 'zoneId' && key !== 'vastUrlParams') {
      script += ',' + key + ':"' + config[key] + '"';
    }
  }
  script += '};' +

  'window.com.stickyadstv.' + getAPIName(bid.params.format) + '.start(config);';

  return script;
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: ['stickyadstv', 'freewheelssp'], //  aliases for freewheel-ssp
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.zoneId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    // var currency = config.getConfig(currency);

    let buildRequest = (currentBidRequest, bidderRequest) => {
      var zone = currentBidRequest.params.zoneId;
      var timeInMillis = new Date().getTime();
      var keyCode = hashcode(zone + '' + timeInMillis);
      var bidfloor = getBidFloor(currentBidRequest, config);
      var format = currentBidRequest.params.format;

      var requestParams = {
        reqType: 'AdsSetup',
        protocolVersion: '4.2',
        zoneId: zone,
        componentId: 'prebid',
        componentSubId: getComponentId(currentBidRequest.params.format),
        timestamp: timeInMillis,
        _fw_bidfloor: (bidfloor > 0) ? bidfloor : 0,
        _fw_bidfloorcur: (bidfloor > 0) ? getFloorCurrency(config) : '',
        pbjs_version: '$prebid.version$',
        pKey: keyCode
      };

      // Add GDPR flag and consent string
      if (bidderRequest && bidderRequest.gdprConsent) {
        requestParams._fw_gdpr_consent = bidderRequest.gdprConsent.consentString;

        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          requestParams._fw_gdpr = bidderRequest.gdprConsent.gdprApplies;
        }
      }

      if (currentBidRequest.params.gdpr_consented_providers) {
        requestParams._fw_gdpr_consented_providers = currentBidRequest.params.gdpr_consented_providers;
      }

      // Add CCPA consent string
      if (bidderRequest && bidderRequest.uspConsent) {
        requestParams._fw_us_privacy = bidderRequest.uspConsent;
      }

      // Add GPP consent
      if (bidderRequest && bidderRequest.gppConsent) {
        requestParams.gpp = bidderRequest.gppConsent.gppString;
        requestParams.gpp_sid = bidderRequest.gppConsent.applicableSections;
      } else if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.regs && bidderRequest.ortb2.regs.gpp) {
        requestParams.gpp = bidderRequest.ortb2.regs.gpp;
        requestParams.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
      }

      // Add content object
      if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.site && bidderRequest.ortb2.site.content && typeof bidderRequest.ortb2.site.content === 'object') {
        try {
          requestParams._fw_prebid_content = JSON.stringify(bidderRequest.ortb2.site.content);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the content object: ' + error);
        }
      }

      // Add schain object
      var schain = currentBidRequest.schain;
      if (schain) {
        try {
          requestParams.schain = JSON.stringify(schain);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the schain: ' + error);
        }
      }

      if (currentBidRequest.userIdAsEids && currentBidRequest.userIdAsEids.length > 0) {
        try {
          requestParams._fw_prebid_3p_UID = JSON.stringify(currentBidRequest.userIdAsEids);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the userIdAsEids: ' + error);
        }
      }

      var vastParams = currentBidRequest.params.vastUrlParams;
      if (typeof vastParams === 'object') {
        for (var key in vastParams) {
          if (vastParams.hasOwnProperty(key)) {
            requestParams[key] = vastParams[key];
          }
        }
      }

      var location = bidderRequest?.refererInfo?.page;
      if (isValidUrl(location)) {
        requestParams.loc = location;
      }

      var playerSize = [];
      if (currentBidRequest.mediaTypes.video && currentBidRequest.mediaTypes.video.playerSize) {
        // If mediaTypes is video, get size from mediaTypes.video.playerSize per http://prebid.org/blog/pbjs-3
        if (isArray(currentBidRequest.mediaTypes.video.playerSize[0])) {
          playerSize = currentBidRequest.mediaTypes.video.playerSize[0];
        } else {
          playerSize = currentBidRequest.mediaTypes.video.playerSize;
        }
      } else if (currentBidRequest.mediaTypes.banner.sizes) {
        // If mediaTypes is banner, get size from mediaTypes.banner.sizes per http://prebid.org/blog/pbjs-3
        playerSize = getBiggerSizeWithLimit(currentBidRequest.mediaTypes.banner.sizes, currentBidRequest.mediaTypes.banner.minSizeLimit, currentBidRequest.mediaTypes.banner.maxSizeLimit);
      } else {
        // Backward compatible code, in case size still pass by sizes in bid request
        playerSize = getBiggerSize(currentBidRequest.sizes);
      }

      if (playerSize[0] > 0 || playerSize[1] > 0) {
        requestParams.playerSize = playerSize[0] + 'x' + playerSize[1];
      }

      // Add video context and placement in requestParams
      if (currentBidRequest.mediaTypes.video) {
        var videoContext = currentBidRequest.mediaTypes.video.context ? currentBidRequest.mediaTypes.video.context : '';
        var videoPlacement = currentBidRequest.mediaTypes.video.placement ? currentBidRequest.mediaTypes.video.placement : null;
        var videoPlcmt = currentBidRequest.mediaTypes.video.plcmt ? currentBidRequest.mediaTypes.video.plcmt : null;

        if (format == 'inbanner') {
          videoPlacement = 2;
          videoContext = 'In-Banner';
        }
        requestParams.video_context = videoContext;
        requestParams.video_placement = videoPlacement;
        requestParams.video_plcmt = videoPlcmt;
      }

      return {
        method: 'GET',
        url: FREEWHEEL_ADSSETUP,
        data: requestParams,
        bidRequest: currentBidRequest
      };
    };

    return bidRequests.map(function(currentBidRequest) {
      return buildRequest(currentBidRequest, bidderRequest);
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {object} request the built request object containing the initial bidRequest.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    var bidrequest = request.bidRequest;
    var playerSize = [];
    if (bidrequest.mediaTypes.video && bidrequest.mediaTypes.video.playerSize) {
      // If mediaTypes is video, get size from mediaTypes.video.playerSize per http://prebid.org/blog/pbjs-3
      if (isArray(bidrequest.mediaTypes.video.playerSize[0])) {
        playerSize = bidrequest.mediaTypes.video.playerSize[0];
      } else {
        playerSize = bidrequest.mediaTypes.video.playerSize;
      }
    } else if (bidrequest.mediaTypes.banner.sizes) {
      // If mediaTypes is banner, get size from mediaTypes.banner.sizes per http://prebid.org/blog/pbjs-3
      playerSize = getBiggerSizeWithLimit(bidrequest.mediaTypes.banner.sizes, bidrequest.mediaTypes.banner.minSizeLimit, bidrequest.mediaTypes.banner.maxSizeLimit);
    } else {
      // Backward compatible code, in case size still pass by sizes in bid request
      playerSize = getBiggerSize(bidrequest.sizes);
    }

    if (typeof serverResponse == 'object' && typeof serverResponse.body == 'string') {
      serverResponse = serverResponse.body;
    }

    var xmlDoc;
    try {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(serverResponse, 'application/xml');
    } catch (err) {
      logWarn('Prebid.js - ' + BIDDER_CODE + ' : ' + err);
      return;
    }

    const princingData = getPricing(xmlDoc);
    const creativeId = getCreativeId(xmlDoc);
    const dealId = getDealId(xmlDoc);
    const campaignId = getCampaignId(xmlDoc);
    const bannerId = getBannerId(xmlDoc);
    const topWin = getTopMostWindow();
    const advertiserDomains = getAdvertiserDomain(xmlDoc);

    if (!topWin.freewheelssp_cache) {
      topWin.freewheelssp_cache = {};
    }
    topWin.freewheelssp_cache[bidrequest.adUnitCode] = serverResponse;

    const bidResponses = [];

    if (princingData.price) {
      const bidResponse = {
        requestId: bidrequest.bidId,
        cpm: princingData.price,
        width: playerSize[0],
        height: playerSize[1],
        creativeId: creativeId,
        currency: princingData.currency,
        netRevenue: true,
        ttl: 360,
        meta: { advertiserDomains: advertiserDomains },
        dealId: dealId,
        campaignId: campaignId,
        bannerId: bannerId
      };

      if (bidrequest.mediaTypes.video) {
        bidResponse.mediaType = 'video';
      }

      bidResponse.vastXml = serverResponse;

      bidResponse.ad = formatAdHTML(bidrequest, playerSize);
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, responses, gdprConsent, usPrivacy, gppConsent) {
    const params = {};

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params.gdpr = Number(gdprConsent.gdprApplies);
        params.gdpr_consent = gdprConsent.consentString;
      } else {
        params.gdpr_consent = gdprConsent.consentString;
      }
    }

    if (gppConsent) {
      if (typeof gppConsent.gppString === 'string') {
        params.gpp = gppConsent.gppString;
      }
      if (gppConsent.applicableSections) {
        params.gpp_sid = gppConsent.applicableSections;
      }
    }

    var queryString = '';
    if (params) {
      queryString = '?' + `${formatQS(params)}`;
    }

    const syncs = [];
    if (syncOptions && syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: USER_SYNC_URL + queryString
      });
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: USER_SYNC_URL + queryString
      });
    }

    return syncs;
  },
};

registerBidder(spec);
