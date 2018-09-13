import {ajax} from 'src/ajax'
import CONSTANTS from 'src/constants'
import adapter from 'src/AnalyticsAdapter'
import * as utils from 'src/utils'
import adaptermanager from 'src/adaptermanager'

const TEADS_BIDDER_CODE = 'teads'
const analyticsType = 'endpoint'
const TEADS_ANALYTICS_URL = '//TRACKING_PORT_8080_TCP_ADDR:TRACKING_COLLECTOR_HOST_PORT/track?hbAnalytics=prebid'
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE
const BID_WON = CONSTANTS.EVENTS.BID_WON
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END
const topWindow = window.top

var events = {};
var publisherSampling = null;

var teadsAnalyticsAdapter = Object.assign(adapter(
  {
    TEADS_ANALYTICS_URL,
    analyticsType
  }), {
  track({eventType, args}) {
    events[eventType] = args
    var bidderCodeIsTeads = (args) ? args.bidderCode === TEADS_BIDDER_CODE : false
    switch (eventType) {
      case AUCTION_INIT:
        teadsAnalyticsAdapter.currentBidding.id = args.auctionId
        teadsAnalyticsAdapter.currentBidding.timeout = args.timeout
        break;

      case BID_TIMEOUT:
        args
          .filter(bid => bid.bidder === TEADS_BIDDER_CODE)
          .forEach(bid => _addEvent(bid, 'bidTimeout', true))
        break;

      case BID_RESPONSE:
        if (bidderCodeIsTeads) {
          _addEvent(args, 'bidResponse', {
            timeToRespond: args.timeToRespond
          })
        }
        break;

      case BID_WON:
        (bidderCodeIsTeads) ? _setWin(args) : _setLoose(args)
        break;

      case AUCTION_END:
        if (teadsAnalyticsAdapter.triggeredEvents.length > 0) _sendData()
        break
    }
  }
});

teadsAnalyticsAdapter.currentBidding = {}
teadsAnalyticsAdapter.triggeredEvents = []
teadsAnalyticsAdapter.adapterEnableAnalytics = teadsAnalyticsAdapter.enableAnalytics;

teadsAnalyticsAdapter.enableAnalytics = function (config) {
  if (config.options !== undefined && config.options.hasOwnProperty('sampling') && typeof config.options.sampling === 'number') {
    publisherSampling = getSamplingFactor(config.options.sampling)
  }
  teadsAnalyticsAdapter.adapterEnableAnalytics(config)
};

function getSamplingFactor(sampling) {
  var nonRoundFactor = 100 / (sampling * 100)
  return Math.round(nonRoundFactor)
}

function _addEvent(bid, event, details) {
  var newPidObject = {}

  if (bid.adUnitCode) {
    var pid = topWindow.teadsAnalyticsCache.getIdByAdUnitCode(bid.adUnitCode, 'pid')
    var pageId = topWindow.teadsAnalyticsCache.getIdByAdUnitCode(bid.adUnitCode, 'pageId')
    var trId = topWindow.teadsAnalyticsCache.getIdByAdUnitCode(bid.adUnitCode, 'transactionId')
    var pidEvents = teadsAnalyticsAdapter.triggeredEvents.filter(events => events.pid === pid)
    var publisherTimeout = teadsAnalyticsAdapter.currentBidding.timeout
    var auctionId = teadsAnalyticsAdapter.currentBidding.id

    if (pidEvents.length === 0) {
      newPidObject.timeout = publisherTimeout
      newPidObject.auctionId = auctionId
      newPidObject.sampling = publisherSampling
      newPidObject.pid = pid
      newPidObject.pageId = pageId
      newPidObject.transactionId = trId
      newPidObject[event] = (details !== undefined) ? details : null
      teadsAnalyticsAdapter.triggeredEvents.push(newPidObject)
    } else {
      pidEvents[0][event] = details
    }
  }
}

function _sendData() {
  setTimeout(function () {
    ajax(TEADS_ANALYTICS_URL, {
      success: _successCallback,
      error: _errorCallback
    },
    JSON.stringify(teadsAnalyticsAdapter.triggeredEvents),
    {
      method: 'POST'
    })
  }, 3000)
}

function _setLoose(args) {
  _addEvent(args, 'bidLoose', {
    winner: args.bidderCode,
    price: args.cpm
  })
}

function _setWin(args) {
  _addEvent(args, 'bidWon', {
    price: args.cpm
  })
}

function _successCallback() {
  return utils.logMessage('Teads tracking succesfully called')
}

function _errorCallback(err) {
  return utils.logError('Teads tracking went wrong : ' + err)
}

adaptermanager.registerAnalyticsAdapter({
  adapter: teadsAnalyticsAdapter,
  code: 'teads'
});

export default teadsAnalyticsAdapter
