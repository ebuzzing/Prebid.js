/**
 * AuctionManager modules is responsible for creating auction instances.
 * This module is the gateway for Prebid core to access auctions.
 * It stores all created instances of auction and can be used to get consolidated values from auction.
 */

/**
 * @typedef {Object} AuctionManager
 *
 * @property {function(): Array} getBidsRequested - returns consolidated bid requests
 * @property {function(): Array} getBidsReceived - returns consolidated bid received
 * @property {function(string): Array} getAllBidsForAdUnitCode - returns consolidated bid received for a given adUnit
 * @property {function(): Array} getAllWinningBids - returns all winning bids
 * @property {function(): Array} getAdUnits - returns consolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns consolidated adUnitCodes
 * @property {function(): Array} getNoBids - returns consolidated adUnitCodes
 * @property {function(string, string): void} setStatusForBids - set status for bids
 * @property {function(): string} getLastAuctionId - returns last auctionId
 * @property {function(Object): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(string): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 * @property {function(Object): void} addWinningBid - add a winning bid to an auction based on auctionId
 * @property {function(): void} clearAllAuctions - clear all auctions for testing
 * @property {function(*): *} onExpiry
 * @property {AuctionIndex} index
 */

import { uniques, logWarn } from './utils.js';
import { newAuction, getStandardBidderSettings, AUCTION_COMPLETED } from './auction.js';
import {AuctionIndex} from './auctionIndex.js';
import { BID_STATUS, JSON_MAPPING } from './constants.js';
import {useMetrics} from './utils/perfMetrics.js';
import {ttlCollection} from './utils/ttlCollection.js';
import {getMinBidCacheTTL, onMinBidCacheTTLChange} from './bidTTL.js';

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
export function newAuctionManager() {
  const _auctions = ttlCollection({
    startTime: (au) => au.end.then(() => au.getAuctionEnd()),
    ttl: (au) => getMinBidCacheTTL() == null ? null : au.end.then(() => {
      return Math.max(getMinBidCacheTTL(), ...au.getBidsReceived().map(bid => bid.ttl)) * 1000
    }),
  });

  onMinBidCacheTTLChange(() => _auctions.refresh());

  const auctionManager = {
    onExpiry: _auctions.onExpiry
  };

  function getAuction(auctionId) {
    for (const auction of _auctions) {
      if (auction.getAuctionId() === auctionId) return auction;
    }
  }

  auctionManager.addWinningBid = function(bid) {
    const metrics = useMetrics(bid.metrics);
    metrics.checkpoint('bidWon');
    metrics.timeBetween('auctionEnd', 'bidWon', 'adserver.pending');
    metrics.timeBetween('requestBids', 'bidWon', 'adserver.e2e');
    const auction = getAuction(bid.auctionId);
    if (auction) {
      auction.addWinningBid(bid);
    } else {
      logWarn(`Auction not found when adding winning bid`);
    }
  };

  Object.entries({
    getAllWinningBids: {
      name: 'getWinningBids',
    },
    getBidsRequested: {
      name: 'getBidRequests'
    },
    getNoBids: {},
    getAdUnits: {},
    getBidsReceived: {
      pre(auction) {
        return auction.getAuctionStatus() === AUCTION_COMPLETED;
      }
    },
    getAdUnitCodes: {
      post: uniques,
    }
  }).forEach(([mgrMethod, {name = mgrMethod, pre, post}]) => {
    const mapper = pre == null
      ? (auction) => auction[name]()
      : (auction) => pre(auction) ? auction[name]() : [];
    const filter = post == null
      ? (items) => items
      : (items) => items.filter(post)
    auctionManager[mgrMethod] = () => {
      return filter(_auctions.toArray().flatMap(mapper));
    }
  })

  function allBidsReceived() {
    return _auctions.toArray().flatMap(au => au.getBidsReceived())
  }

  auctionManager.getAllBidsForAdUnitCode = function(adUnitCode) {
    return allBidsReceived()
      .filter(bid => bid && bid.adUnitCode === adUnitCode)
  };

  auctionManager.createAuction = function(opts) {
    const auction = newAuction(opts);
    _addAuction(auction);
    return auction;
  };

  auctionManager.findBidByAdId = function(adId) {
    return allBidsReceived()
      .find(bid => bid.adId === adId);
  };

  auctionManager.getStandardBidderAdServerTargeting = function() {
    return getStandardBidderSettings()[JSON_MAPPING.ADSERVER_TARGETING];
  };

  auctionManager.setStatusForBids = function(adId, status) {
    const bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;

    if (bid && status === BID_STATUS.BID_TARGETING_SET) {
      const auction = getAuction(bid.auctionId);
      if (auction) auction.setBidTargeting(bid);
    }
  }

  auctionManager.getLastAuctionId = function() {
    const auctions = _auctions.toArray();
    return auctions.length && auctions[auctions.length - 1].getAuctionId()
  };

  auctionManager.clearAllAuctions = function() {
    _auctions.clear();
  }

  function _addAuction(auction) {
    _auctions.add(auction);
  }

  auctionManager.index = new AuctionIndex(() => _auctions.toArray());

  return auctionManager;
}

export const auctionManager = newAuctionManager();
