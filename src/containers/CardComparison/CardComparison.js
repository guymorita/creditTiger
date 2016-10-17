import _R from 'ramda';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-toolbox/lib/link';
import { CardBox } from 'components';
import { AnnualFeeCheckboxes, FteCheckbox } from 'components';

const getVisibleCards = (cards, filters, sort, routes) => {
  let cardsToShow = cards;
  let onlyIssuerKeysToFilter = {}; // eslint-disable-line prefer-const

  const { onlyShowIssuer, hiddenCardKeys} = filters;

  if (Object.keys(hiddenCardKeys).length) {
    cardsToShow = cardsToShow.filter(ca => !hiddenCardKeys.hasOwnProperty(ca.cardKey));
  }

  if (filters.noFteOnly === true) {
    cardsToShow = cardsToShow.filter(ca => ca.ftf === 0.0);
  }

  if (filters.noAnnualFeeOnly === true) {
    cardsToShow = cardsToShow.filter(ca => ca.annualFee === 0.0 || ca.annualFeeWaived === true);
  }

  const allNotSame = filters.annualFeeWaivedOnly !== filters.annualFeeLess100Only || filters.annualFeeLess100Only !== filters.annualFee100MoreOnly;

  if (allNotSame) {
    cardsToShow = cardsToShow.filter((ca) => {
      let showCard = false;

      if (filters.annualFeeWaivedOnly && (ca.annualFeeWaived === true || ca.annualFee === 0)) {
        showCard = true;
      }

      if (filters.annualFeeLess100Only && ca.annualFee < 100) {
        showCard = true;
      }

      if (filters.annualFee100MoreOnly && ca.annualFee >= 100) {
        showCard = true;
      }

      return showCard;
    });
  }

  for (let key in onlyShowIssuer) {  // eslint-disable-line prefer-const
    if (onlyShowIssuer[key] === true) {
      onlyIssuerKeysToFilter[key] = true;
    }
  }

  if (Object.keys(onlyIssuerKeysToFilter).length > 0) {
    cardsToShow = cardsToShow.filter(ca => onlyIssuerKeysToFilter[ca.issuerName] === true);
  }

  if (sort.sortType === 'SET_COUNTRY') {
    const curAwardRoutes = routes.countryAwardRoutes[sort.currentCountryName];
    const curCashRoutes = routes.countryCashRoutes[sort.currentCountryName];

    const plus = (aa, bb) => aa + bb;
    const numPointsFn = ro => ro.numberOfPointsReq;
    const cashFn = ro => ro.cashReq;

    cardsToShow.forEach((ca) => {
      const rewardProviver = ca.rewardProvider;
      ca.awardRedeemPerc = 0;
      ca.cashRedeemPerc = 0;
      ca.bestRedeemPerc = 0;

      ca.awardRoutesForSort = curAwardRoutes[rewardProviver] || [];

      if (ca.canConvToCash) {
        const cashRouteList = _R.map(cashFn, curCashRoutes);
        const averageCash = _R.reduce(plus, 0, cashRouteList) / curCashRoutes.length;

        ca.cashRedeemPerc = (ca.curBonusPts * ca.travelConvRate) / averageCash;
        ca.cashRoutesForSort = curCashRoutes;
      }

      if (ca.awardRoutesForSort.length) {
        const numPointsRouteList = _R.map(numPointsFn, ca.awardRoutesForSort);
        const averageNumPoints = _R.reduce(plus, 0, numPointsRouteList) / ca.awardRoutesForSort.length;
        ca.awardRedeemPerc = ca.curBonusPts / averageNumPoints;
      }

      ca.bestRedeemPerc = ca.awardRedeemPerc > ca.cashRedeemPerc ? ca.awardRedeemPerc : ca.cashRedeemPerc;
    });

    const hasNoRoutes = ca => !ca.awardRoutesForSort.length && !ca.canConvToCash;
    cardsToShow = _R.reject(hasNoRoutes, cardsToShow);

    cardsToShow.sort((ca, cb) => { return (cb.bestRedeemPerc - ca.bestRedeemPerc);});
  } else {
    cardsToShow.sort((ca, cb) => { return (cb.overallRank - ca.overallRank);});
  }

  cardsToShow.forEach((ca, ind) => { ca.curRank = ind + 1; });

  return cardsToShow;
};

@connect(
  state => (
    {
      cards: state.cards,
      filter: state.filter,
      sort: state.sort,
      routes: state.routes
    }
  )
)

export default class Credit extends Component {
  static propTypes = {
    cards: PropTypes.object,
    filter: PropTypes.object,
    sort: PropTypes.object,
    routes: PropTypes.object
  };

  render() {
    const { all } = this.props.cards;
    const { filter, sort, routes } = this.props;
    const possibleCards = getVisibleCards(all, filter, sort, routes);
    sort.currentNumCards = possibleCards.length;
    const visibleCards = possibleCards.slice(0, 3);
    const styles = require('./CardComparison.scss');

    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-2">
            <h3>Filters</h3>
            <h5>Current Destination</h5>
            <div>{sort.currentCountryName}</div>
            <Link href="/" label="Change" />
            <h5>Annual Fees</h5>
            <div><AnnualFeeCheckboxes /></div>
            <h5>Transaction Fees</h5>
            <div><FteCheckbox /></div>
          </div>
          <div className="col-md-10">
            <div className={styles.cardListHeader}>
              <div className="row">
                <div className="col-md-6">
                  <h2>Best Cards for Free Flights to {sort.currentCountryName}</h2>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <h4>How it works:</h4>
                  <p>1. Use the filters to pick the cards that fit your needs.</p>
                  <p>2. Apply / get approved for 1-3 cards and use them instead of your current cards.</p>
                  <p>3. After you meet the minimum spends you will be rewarded with the points shown below.</p>
                  <p>4. Use those points to redeem travel using the method shown below.</p>
                </div>
                <div className="col-md-6">
                  <h4>Why this works:</h4>
                  <p>1. There is no catch. Credit card companies want you to use their cards and they provide big incentives to do so.</p>
                  <p>2. If you abuse the card like any other bank account or loan it could harm your credit.</p>
                </div>
              </div>
            </div>
            <div className={styles.cardListSubHeader}>
              <div className="row">
                <div className="col-md-6">
                  3 of {sort.currentNumCards} cards
                </div>
                <div className={styles.view + ' col-md-6'}>
                  View: Basic | Detailed
                </div>
              </div>
            </div>
            {visibleCards && visibleCards.length &&
              <div>
                {visibleCards.map((card) => {
                  return (
                    <CardBox card={card} />
                  );
                })}
              </div>
            }
          </div>
        </div>
      </div>
    );
  }
}